import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 transition-colors duration-200">
      <div className="relative w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl p-8 overflow-hidden text-center flex flex-col items-center">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="p-4 bg-primary/10 text-primary rounded-full border border-primary/20 mb-6">
          <Compass size={40} className="stroke-[1.5] animate-[spin_8s_linear_infinite]" />
        </div>

        <h1 className="text-8xl font-black tracking-tighter text-primary">
          404
        </h1>
        
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground mt-4">
          Lost in Space?
        </h2>
        
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          The page you are looking for doesn't exist or has been moved to a new destination.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full mt-8 relative z-10">
          <Button
            onClick={() => navigate(-1)}
            className="bg-primary text-primary-foreground flex-1 flex items-center justify-center gap-2 font-semibold"
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 font-semibold"
          >
            <Home size={16} />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
