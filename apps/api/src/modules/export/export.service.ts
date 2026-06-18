import { Response } from 'express';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Expense } from '../expenses/expense.model';
import { Group, GroupMember } from '../groups/group.model';
import { Settlement } from '../settlements/settlement.model';
import { User } from '../users/user.model';
import { AppError } from '../../core/errors/AppError';

export class ExportService {
  /**
   * Helper to fetch group data
   */
  private async getGroupData(groupId: string) {
    const group = await Group.findById(groupId);
    if (!group) throw new AppError('Group not found', 404);

    const members = await GroupMember.find({ group: groupId }).populate('user', 'username email');
    return { group, members };
  }

  /**
   * Group Report - CSV Stream
   */
  async exportGroupCSV(res: Response, groupId: string) {
    const { group, members } = await this.getGroupData(groupId);

    res.write('--- GROUP INFORMATION ---\n');
    res.write(`Name,"${group.name.replace(/"/g, '""')}"\n`);
    res.write(`Description,"${(group.description || '').replace(/"/g, '""')}"\n`);
    res.write(`Currency,${group.currency}\n`);
    res.write(`Monthly Budget,${group.monthlyBudget || 0}\n\n`);

    res.write('--- MEMBERS ---\n');
    res.write('Username,Email,Role\n');
    members.forEach((m: any) => {
      res.write(`"${m.user?.username || 'Unknown'}","${m.user?.email || ''}","${m.role}"\n`);
    });
    res.write('\n');

    res.write('--- EXPENSES ---\n');
    res.write('Date,Description,Category,Total Amount,Paid By,Status\n');

    const expenseCursor = Expense.find({ group: new mongoose.Types.ObjectId(groupId), status: { $ne: 'DELETED' } })
      .populate('paidBy', 'username')
      .cursor();

    for (let exp = await expenseCursor.next(); exp != null; exp = await expenseCursor.next()) {
      const paidBy = (exp.paidBy as any)?.username || 'Unknown';
      const desc = exp.description.replace(/"/g, '""');
      res.write(`"${exp.date.toISOString()}","${desc}","${exp.category}",${exp.amount},"${paidBy}","${exp.status}"\n`);
    }
    res.write('\n');

    res.write('--- SETTLEMENTS ---\n');
    res.write('Date,Payer,Recipient,Amount,Notes\n');

    const settlementCursor = Settlement.find({ group: new mongoose.Types.ObjectId(groupId) })
      .populate('payer', 'username')
      .populate('recipient', 'username')
      .cursor();

    for (let set = await settlementCursor.next(); set != null; set = await settlementCursor.next()) {
      const payerName = (set.payer as any)?.username || 'Unknown';
      const recName = (set.recipient as any)?.username || 'Unknown';
      const noteStr = (set.notes || '').replace(/"/g, '""');
      res.write(`"${set.date.toISOString()}","${payerName}","${recName}",${set.amount},"${noteStr}"\n`);
    }
  }

  /**
   * Group Report - Excel Stream
   */
  async exportGroupExcel(res: Response, groupId: string) {
    const { group, members } = await this.getGroupData(groupId);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Group Report Summary']).font = { bold: true, size: 16, color: { argb: 'FF3F51B5' } };
    summarySheet.addRow([]);
    summarySheet.addRow(['Group Name', group.name]);
    summarySheet.addRow(['Description', group.description || 'N/A']);
    summarySheet.addRow(['Currency', group.currency]);
    summarySheet.addRow(['Monthly Budget', group.monthlyBudget || 0]);
    summarySheet.addRow(['Generated At', new Date().toLocaleString()]);
    
    summarySheet.getColumn(1).width = 18;
    summarySheet.getColumn(1).font = { bold: true };
    summarySheet.getColumn(2).width = 35;
    summarySheet.commit();

    const membersSheet = workbook.addWorksheet('Members');
    membersSheet.columns = [
      { header: 'Username', key: 'username', width: 22 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Role', key: 'role', width: 15 }
    ];
    membersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    membersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3F51B5' }
    };
    members.forEach((m: any) => {
      membersSheet.addRow({
        username: m.user?.username || 'Unknown',
        email: m.user?.email || '',
        role: m.role
      }).commit();
    });
    membersSheet.commit();

    const expensesSheet = workbook.addWorksheet('Expenses');
    expensesSheet.columns = [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Paid By', key: 'paidBy', width: 22 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    expensesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    expensesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3F51B5' }
    };

    const expenseCursor = Expense.find({ group: new mongoose.Types.ObjectId(groupId), status: { $ne: 'DELETED' } })
      .populate('paidBy', 'username')
      .cursor();

    for (let exp = await expenseCursor.next(); exp != null; exp = await expenseCursor.next()) {
      expensesSheet.addRow({
        date: exp.date.toLocaleDateString(),
        description: exp.description,
        category: exp.category,
        amount: exp.amount,
        paidBy: (exp.paidBy as any)?.username || 'Unknown',
        status: exp.status
      }).commit();
    }
    expensesSheet.commit();

    const settlementsSheet = workbook.addWorksheet('Settlements');
    settlementsSheet.columns = [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Payer', key: 'payer', width: 22 },
      { header: 'Recipient', key: 'recipient', width: 22 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    settlementsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    settlementsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3F51B5' }
    };

    const settlementCursor = Settlement.find({ group: new mongoose.Types.ObjectId(groupId) })
      .populate('payer', 'username')
      .populate('recipient', 'username')
      .cursor();

    for (let set = await settlementCursor.next(); set != null; set = await settlementCursor.next()) {
      settlementsSheet.addRow({
        date: set.date.toLocaleDateString(),
        payer: (set.payer as any)?.username || 'Unknown',
        recipient: (set.recipient as any)?.username || 'Unknown',
        amount: set.amount,
        notes: set.notes || ''
      }).commit();
    }
    settlementsSheet.commit();

    await workbook.commit();
  }

  /**
   * Group Report - PDF Stream
   */
  async exportGroupPDF(res: Response, groupId: string) {
    const { group, members } = await this.getGroupData(groupId);

    const categories: { [key: string]: number } = {};
    let totalSpending = 0;
    const allExpenses = await Expense.find({ group: new mongoose.Types.ObjectId(groupId), status: 'ACTIVE' });
    allExpenses.forEach((e) => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
      totalSpending += e.amount;
    });

    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    doc.pipe(res);

    doc.fillColor('#4f46e5').fontSize(24).font('Helvetica-Bold').text('Monetely', 50, 50);
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(`Group Spending Report: ${group.name}`, 50, 80);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`Generated on ${new Date().toLocaleString()}`, 50, 98);

    doc.moveTo(50, 115).lineTo(doc.page.width - 50, 115).strokeColor('#e2e8f0').lineWidth(1).stroke();

    const cardY = 130;
    doc.rect(50, cardY, 150, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('TOTAL SPENDING', 60, cardY + 12);
    doc.fillColor('#4f46e5').fontSize(14).font('Helvetica-Bold').text(`${group.currency} ${totalSpending.toFixed(2)}`, 60, cardY + 28);

    doc.rect(215, cardY, 150, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('ACTIVE MEMBERS', 225, cardY + 12);
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(`${members.length} Members`, 225, cardY + 28);

    doc.rect(380, cardY, 165, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('MONTHLY BUDGET', 390, cardY + 12);
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(`${group.currency} ${group.monthlyBudget || 0}`, 390, cardY + 28);

    let chartY = 210;
    if (Object.keys(categories).length > 0) {
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Spending Breakdown by Category', 50, chartY);
      chartY += 20;

      const maxVal = Math.max(...Object.values(categories), 1);
      Object.entries(categories).forEach(([cat, val]) => {
        doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text(cat.toUpperCase(), 50, chartY + 2);
        doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`${group.currency} ${val.toFixed(2)}`, 130, chartY + 3);

        doc.rect(200, chartY, 200, 10).fillColor('#f1f5f9').fill();
        const fillWidth = (val / maxVal) * 200;
        doc.rect(200, chartY, fillWidth, 10).fillColor('#4f46e5').fill();

        chartY += 16;
      });
    }

    let tableY = chartY + 25;
    if (tableY > doc.page.height - 150) {
      doc.addPage();
      tableY = 50;
    }

    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Group Members & Roles', 50, tableY);
    tableY += 15;

    doc.rect(50, tableY, doc.page.width - 100, 20).fillColor('#f1f5f9').fill();
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('Username', 60, tableY + 6);
    doc.text('Email Address', 200, tableY + 6);
    doc.text('Role', 420, tableY + 6);
    tableY += 20;

    members.forEach((m: any) => {
      if (tableY > doc.page.height - 60) {
        doc.addPage();
        tableY = 50;
      }
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      doc.text(m.user?.username || 'Unknown', 60, tableY + 5);
      doc.text(m.user?.email || '', 200, tableY + 5);
      doc.text(m.role, 420, tableY + 5);
      doc.moveTo(50, tableY + 18).lineTo(doc.page.width - 50, tableY + 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      tableY += 18;
    });

    let expY = tableY + 25;
    if (expY > doc.page.height - 150) {
      doc.addPage();
      expY = 50;
    }

    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Recent Expenses Ledger', 50, expY);
    expY += 15;

    doc.rect(50, expY, doc.page.width - 100, 20).fillColor('#4f46e5').fill();
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Date', 60, expY + 6);
    doc.text('Description', 130, expY + 6);
    doc.text('Category', 300, expY + 6);
    doc.text('Paid By', 380, expY + 6);
    doc.text('Amount', 470, expY + 6);
    expY += 20;

    const expenses = await Expense.find({ group: new mongoose.Types.ObjectId(groupId), status: { $ne: 'DELETED' } })
      .populate('paidBy', 'username')
      .sort({ date: -1 });

    expenses.forEach((e: any) => {
      if (expY > doc.page.height - 60) {
        doc.addPage();
        expY = 50;
        doc.rect(50, expY, doc.page.width - 100, 20).fillColor('#4f46e5').fill();
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('Date', 60, expY + 6);
        doc.text('Description', 130, expY + 6);
        doc.text('Category', 300, expY + 6);
        doc.text('Paid By', 380, expY + 6);
        doc.text('Amount', 470, expY + 6);
        expY += 20;
      }
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      doc.text(e.date.toLocaleDateString(), 60, expY + 5);
      doc.text(e.description.length > 30 ? e.description.substring(0, 28) + '..' : e.description, 130, expY + 5);
      doc.text(e.category, 300, expY + 5);
      doc.text((e.paidBy as any)?.username || 'Unknown', 380, expY + 5);
      doc.text(`${group.currency} ${e.amount.toFixed(2)}`, 470, expY + 5, { align: 'right', width: 60 });
      doc.moveTo(50, expY + 18).lineTo(doc.page.width - 50, expY + 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      expY += 18;
    });

    let setY = expY + 25;
    if (setY > doc.page.height - 150) {
      doc.addPage();
      setY = 50;
    }

    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Settlement History', 50, setY);
    setY += 15;

    doc.rect(50, setY, doc.page.width - 100, 20).fillColor('#f1f5f9').fill();
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('Date', 60, setY + 6);
    doc.text('From (Payer)', 150, setY + 6);
    doc.text('To (Recipient)', 290, setY + 6);
    doc.text('Amount', 460, setY + 6);
    setY += 20;

    const settlements = await Settlement.find({ group: new mongoose.Types.ObjectId(groupId) })
      .populate('payer', 'username')
      .populate('recipient', 'username')
      .sort({ date: -1 });

    settlements.forEach((s: any) => {
      if (setY > doc.page.height - 60) {
        doc.addPage();
        setY = 50;
      }
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      doc.text(s.date.toLocaleDateString(), 60, setY + 5);
      doc.text((s.payer as any)?.username || 'Unknown', 150, setY + 5);
      doc.text((s.recipient as any)?.username || 'Unknown', 290, setY + 5);
      doc.text(`${group.currency} ${s.amount.toFixed(2)}`, 460, setY + 5, { align: 'right', width: 70 });
      doc.moveTo(50, setY + 18).lineTo(doc.page.width - 50, setY + 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      setY += 18;
    });

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.moveTo(50, doc.page.height - 45).lineTo(doc.page.width - 50, doc.page.height - 45).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fontSize(7).fillColor('#94a3b8');
      doc.text(`Generated by Monetely Report Server`, 50, doc.page.height - 35);
      doc.text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 35, { align: 'right', width: doc.page.width - 100 });
    }

    doc.end();
  }

  /**
   * Helper to fetch user data
   */
  private async getUserData(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const memberships = await GroupMember.find({ user: userId }).populate('group');
    const groupIds = memberships.map(m => m.group._id);

    return { user, memberships, groupIds };
  }

  /**
   * User Report - CSV Stream
   */
  async exportUserCSV(res: Response, userId: string) {
    const { user, memberships, groupIds } = await this.getUserData(userId);

    res.write('--- USER PROFILE ---\n');
    res.write(`Username,${user.username}\n`);
    res.write(`Email,${user.email}\n`);
    res.write(`Default Currency,${user.defaultCurrency}\n`);
    res.write(`Timezone,${user.timezone}\n`);
    res.write(`Generated At,${new Date().toLocaleString()}\n\n`);

    res.write('--- GROUPS INVOLVED ---\n');
    res.write('Group Name,Description,Currency,Role\n');
    memberships.forEach((m: any) => {
      if (m.group) {
        res.write(`"${m.group.name.replace(/"/g, '""')}","${(m.group.description || '').replace(/"/g, '""')}","${m.group.currency}","${m.role}"\n`);
      }
    });
    res.write('\n');

    res.write('--- EXPENSES (SHARED) ---\n');
    res.write('Date,Group,Description,Category,Total Amount,Paid By,Your Share Owed,Status\n');

    const expenseCursor = Expense.find({
      group: { $in: groupIds },
      status: { $ne: 'DELETED' },
      $or: [
        { paidBy: new mongoose.Types.ObjectId(userId) },
        { 'splits.user': new mongoose.Types.ObjectId(userId) }
      ]
    }).populate('group', 'name').populate('paidBy', 'username').cursor();

    for (let exp = await expenseCursor.next(); exp != null; exp = await expenseCursor.next()) {
      const paidBy = (exp.paidBy as any)?.username || 'Unknown';
      const groupName = (exp.group as any)?.name || 'Unknown Group';
      const desc = exp.description.replace(/"/g, '""');
      const userSplit = exp.splits.find((s) => s.user.toString() === userId);
      const userOwed = userSplit ? userSplit.amountOwed : 0;

      res.write(`"${exp.date.toISOString()}","${groupName}","${desc}","${exp.category}",${exp.amount},"${paidBy}",${userOwed},"${exp.status}"\n`);
    }
    res.write('\n');

    res.write('--- SETTLEMENTS (INVOLVED) ---\n');
    res.write('Date,Group,Payer,Recipient,Amount,Notes\n');

    const settlementCursor = Settlement.find({
      group: { $in: groupIds },
      $or: [
        { payer: new mongoose.Types.ObjectId(userId) },
        { recipient: new mongoose.Types.ObjectId(userId) }
      ]
    }).populate('group', 'name').populate('payer', 'username').populate('recipient', 'username').cursor();

    for (let set = await settlementCursor.next(); set != null; set = await settlementCursor.next()) {
      const groupName = (set.group as any)?.name || 'Unknown Group';
      const payerName = (set.payer as any)?.username || 'Unknown';
      const recName = (set.recipient as any)?.username || 'Unknown';
      const noteStr = (set.notes || '').replace(/"/g, '""');

      res.write(`"${set.date.toISOString()}","${groupName}","${payerName}","${recName}",${set.amount},"${noteStr}"\n`);
    }
  }

  /**
   * User Report - Excel Stream
   */
  async exportUserExcel(res: Response, userId: string) {
    const { user, memberships, groupIds } = await this.getUserData(userId);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true
    });

    const profileSheet = workbook.addWorksheet('Profile Summary');
    profileSheet.addRow(['Monetely Personal Financial Report']).font = { bold: true, size: 16, color: { argb: 'FF10B981' } };
    profileSheet.addRow([]);
    profileSheet.addRow(['Username', user.username]);
    profileSheet.addRow(['Email', user.email]);
    profileSheet.addRow(['Default Currency', user.defaultCurrency]);
    profileSheet.addRow(['Timezone', user.timezone]);
    profileSheet.addRow(['Total Groups Involved', memberships.length]);
    profileSheet.addRow(['Report Generated', new Date().toLocaleString()]);
    
    profileSheet.getColumn(1).width = 22;
    profileSheet.getColumn(1).font = { bold: true };
    profileSheet.getColumn(2).width = 35;
    profileSheet.commit();

    const groupsSheet = workbook.addWorksheet('My Groups');
    groupsSheet.columns = [
      { header: 'Group Name', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Currency', key: 'currency', width: 12 },
      { header: 'My Role', key: 'role', width: 15 }
    ];
    groupsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    groupsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }
    };
    memberships.forEach((m: any) => {
      if (m.group) {
        groupsSheet.addRow({
          name: m.group.name,
          description: m.group.description || 'N/A',
          currency: m.group.currency,
          role: m.role
        }).commit();
      }
    });
    groupsSheet.commit();

    const expensesSheet = workbook.addWorksheet('Shared Expenses');
    expensesSheet.columns = [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Group', key: 'group', width: 22 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Total Amount', key: 'amount', width: 15 },
      { header: 'Paid By', key: 'paidBy', width: 22 },
      { header: 'My Share Owed', key: 'myOwed', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ];
    expensesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    expensesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }
    };

    const expenseCursor = Expense.find({
      group: { $in: groupIds },
      status: { $ne: 'DELETED' },
      $or: [
        { paidBy: new mongoose.Types.ObjectId(userId) },
        { 'splits.user': new mongoose.Types.ObjectId(userId) }
      ]
    }).populate('group', 'name').populate('paidBy', 'username').cursor();

    for (let exp = await expenseCursor.next(); exp != null; exp = await expenseCursor.next()) {
      const split = exp.splits.find(s => s.user.toString() === userId);
      const myOwed = split ? split.amountOwed : 0;
      expensesSheet.addRow({
        date: exp.date.toLocaleDateString(),
        group: (exp.group as any)?.name || 'Unknown Group',
        description: exp.description,
        category: exp.category,
        amount: exp.amount,
        paidBy: (exp.paidBy as any)?.username || 'Unknown',
        myOwed: myOwed,
        status: exp.status
      }).commit();
    }
    expensesSheet.commit();

    const settlementsSheet = workbook.addWorksheet('Settlements');
    settlementsSheet.columns = [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Group', key: 'group', width: 22 },
      { header: 'Payer', key: 'payer', width: 22 },
      { header: 'Recipient', key: 'recipient', width: 22 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    settlementsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    settlementsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }
    };

    const settlementCursor = Settlement.find({
      group: { $in: groupIds },
      $or: [
        { payer: new mongoose.Types.ObjectId(userId) },
        { recipient: new mongoose.Types.ObjectId(userId) }
      ]
    }).populate('group', 'name').populate('payer', 'username').populate('recipient', 'username').cursor();

    for (let set = await settlementCursor.next(); set != null; set = await settlementCursor.next()) {
      settlementsSheet.addRow({
        date: set.date.toLocaleDateString(),
        group: (set.group as any)?.name || 'Unknown Group',
        payer: (set.payer as any)?.username || 'Unknown',
        recipient: (set.recipient as any)?.username || 'Unknown',
        amount: set.amount,
        notes: set.notes || ''
      }).commit();
    }
    settlementsSheet.commit();

    await workbook.commit();
  }

  /**
   * User Report - PDF Stream
   */
  async exportUserPDF(res: Response, userId: string) {
    const { user, memberships, groupIds } = await this.getUserData(userId);

    const categoryTotals: { [key: string]: number } = {};
    let totalPaidByUser = 0;
    let totalOwedByUser = 0;

    const allUserExpenses = await Expense.find({
      group: { $in: groupIds },
      status: 'ACTIVE',
      $or: [
        { paidBy: new mongoose.Types.ObjectId(userId) },
        { 'splits.user': new mongoose.Types.ObjectId(userId) }
      ]
    });

    allUserExpenses.forEach((exp) => {
      const isPaidByMe = exp.paidBy.toString() === userId;
      const split = exp.splits.find(s => s.user.toString() === userId);
      const myOwed = split ? split.amountOwed : 0;

      if (isPaidByMe) totalPaidByUser += exp.amount;
      totalOwedByUser += myOwed;

      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + myOwed;
    });

    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    doc.pipe(res);

    doc.fillColor('#10b981').fontSize(24).font('Helvetica-Bold').text('Monetely', 50, 50);
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(`Personal Financial Statement: ${user.username}`, 50, 80);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`Email: ${user.email} | Default Currency: ${user.defaultCurrency}`, 50, 98);

    doc.moveTo(50, 115).lineTo(doc.page.width - 50, 115).strokeColor('#e2e8f0').lineWidth(1).stroke();

    const cardY = 130;
    doc.rect(50, cardY, 150, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('TOTAL SPENT (PAID)', 60, cardY + 12);
    doc.fillColor('#10b981').fontSize(14).font('Helvetica-Bold').text(`${user.defaultCurrency} ${totalPaidByUser.toFixed(2)}`, 60, cardY + 28);

    doc.rect(215, cardY, 150, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('YOUR SHARE OWED', 225, cardY + 12);
    doc.fillColor('#ef4444').fontSize(14).font('Helvetica-Bold').text(`${user.defaultCurrency} ${totalOwedByUser.toFixed(2)}`, 225, cardY + 28);

    const netBal = totalPaidByUser - totalOwedByUser;
    const netBalColor = netBal >= 0 ? '#10b981' : '#ef4444';

    doc.rect(380, cardY, 165, 60).fillColor('#f8fafc').fillAndStroke('#e2e8f0');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text('NET POSITION', 390, cardY + 12);
    doc.fillColor(netBalColor).fontSize(14).font('Helvetica-Bold').text(`${user.defaultCurrency} ${netBal.toFixed(2)}`, 390, cardY + 28);

    let chartY = 210;
    if (Object.keys(categoryTotals).length > 0) {
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Your Share Spending by Category', 50, chartY);
      chartY += 20;

      const maxVal = Math.max(...Object.values(categoryTotals), 1);
      Object.entries(categoryTotals).forEach(([cat, val]) => {
        doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold').text(cat.toUpperCase(), 50, chartY + 2);
        doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`${user.defaultCurrency} ${val.toFixed(2)}`, 130, chartY + 3);

        doc.rect(200, chartY, 200, 10).fillColor('#f1f5f9').fill();
        const fillWidth = (val / maxVal) * 200;
        doc.rect(200, chartY, fillWidth, 10).fillColor('#10b981').fill();

        chartY += 16;
      });
    }

    let tableY = chartY + 25;
    if (tableY > doc.page.height - 150) {
      doc.addPage();
      tableY = 50;
    }

    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('My Activity in Billing Groups', 50, tableY);
    tableY += 15;

    doc.rect(50, tableY, doc.page.width - 100, 20).fillColor('#f1f5f9').fill();
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('Group Name', 60, tableY + 6);
    doc.text('Currency', 250, tableY + 6);
    doc.text('Role', 350, tableY + 6);
    tableY += 20;

    memberships.forEach((m: any) => {
      if (!m.group) return;
      if (tableY > doc.page.height - 60) {
        doc.addPage();
        tableY = 50;
      }
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      doc.text(m.group.name, 60, tableY + 5);
      doc.text(m.group.currency, 250, tableY + 5);
      doc.text(m.role, 350, tableY + 5);
      doc.moveTo(50, tableY + 18).lineTo(doc.page.width - 50, tableY + 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      tableY += 18;
    });

    let expY = tableY + 25;
    if (expY > doc.page.height - 150) {
      doc.addPage();
      expY = 50;
    }

    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Expenses Log (Personal Share Ledger)', 50, expY);
    expY += 15;

    doc.rect(50, expY, doc.page.width - 100, 20).fillColor('#10b981').fill();
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Date', 60, expY + 6);
    doc.text('Group', 120, expY + 6);
    doc.text('Description', 210, expY + 6);
    doc.text('Paid By', 350, expY + 6);
    doc.text('Total Amount', 420, expY + 6);
    doc.text('Your Share', 485, expY + 6);
    expY += 20;

    const expenses = await Expense.find({
      group: { $in: groupIds },
      status: { $ne: 'DELETED' },
      $or: [
        { paidBy: new mongoose.Types.ObjectId(userId) },
        { 'splits.user': new mongoose.Types.ObjectId(userId) }
      ]
    }).populate('group', 'name currency').populate('paidBy', 'username').sort({ date: -1 });

    expenses.forEach((e: any) => {
      if (expY > doc.page.height - 60) {
        doc.addPage();
        expY = 50;
        doc.rect(50, expY, doc.page.width - 100, 20).fillColor('#10b981').fill();
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('Date', 60, expY + 6);
        doc.text('Group', 120, expY + 6);
        doc.text('Description', 210, expY + 6);
        doc.text('Paid By', 350, expY + 6);
        doc.text('Total Amount', 420, expY + 6);
        doc.text('Your Share', 485, expY + 6);
        expY += 20;
      }
      const split = e.splits.find((s: any) => s.user.toString() === userId);
      const myOwed = split ? split.amountOwed : 0;
      const groupCurrency = e.group?.currency || 'USD';

      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      doc.text(e.date.toLocaleDateString(), 60, expY + 5);
      doc.text(e.group?.name ? (e.group.name.length > 18 ? e.group.name.substring(0, 16) + '..' : e.group.name) : 'Unknown', 120, expY + 5);
      doc.text(e.description.length > 25 ? e.description.substring(0, 23) + '..' : e.description, 210, expY + 5);
      doc.text((e.paidBy as any)?.username || 'Unknown', 350, expY + 5);
      doc.text(`${groupCurrency} ${e.amount.toFixed(2)}`, 420, expY + 5);
      doc.text(`${groupCurrency} ${myOwed.toFixed(2)}`, 485, expY + 5, { align: 'right', width: 55 });
      doc.moveTo(50, expY + 18).lineTo(doc.page.width - 50, expY + 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      expY += 18;
    });

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.moveTo(50, doc.page.height - 45).lineTo(doc.page.width - 50, doc.page.height - 45).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fontSize(7).fillColor('#94a3b8');
      doc.text(`Generated by Monetely Report Server`, 50, doc.page.height - 35);
      doc.text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 35, { align: 'right', width: doc.page.width - 100 });
    }

    doc.end();
  }
}

export const exportService = new ExportService();
