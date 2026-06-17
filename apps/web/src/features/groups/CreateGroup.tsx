import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../config/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'JPY', label: 'JPY (¥)' },
];

export const CreateGroup: React.FC = () => {
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState(user?.defaultCurrency || 'USD');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (user?.defaultCurrency) {
      setCurrency(user.defaultCurrency);
    }
  }, [user?.defaultCurrency]);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (name.length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await api.post('/groups', {
        name: name.trim(),
        description: description.trim(),
        currency,
      });

      const { group } = response.data.data;
      addToast(`Group "${group.name}" created successfully!`, 'success');
      navigate(`/groups/${group._id}`);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Failed to create group';
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Create a New Group</CardTitle>
          <CardDescription>
            Organize shared bills, trips, or household expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Group Name"
              placeholder="e.g. Ski Trip 2026, Apartment 4B"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              disabled={isLoading}
            />

            <Input
              label="Description (Optional)"
              placeholder="e.g. Sharing cabin booking, groceries, and travel costs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />

            <Select
              label="Default Currency"
              options={CURRENCIES}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={isLoading}
            />

            <div className="flex gap-3 justify-end mt-2">
              <Button
                type="button"
                className='bg-secondary text-secondary-foreground'
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Create Group
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default CreateGroup;
