/* eslint-disable @typescript-eslint/no-explicit-any */
import { CheckCircle, Clock, AlertCircle, Activity } from "lucide-react";

interface SwapProgressProps {
  status: 'pending' | 'fulfilled' | 'revoked';
  createdAt: string;
  className?: string;
}

const SwapProgress = ({ status, createdAt, className = "" }: SwapProgressProps) => {
  const steps = [
    { 
      id: 'created', 
      label: 'Request Created', 
      description: 'Swap request generated',
      completed: true,
      timestamp: createdAt
    },
    { 
      id: 'waiting', 
      label: 'Awaiting Fulfillment', 
      description: 'Waiting for Bitcoin transaction',
      completed: status !== 'pending',
      current: status === 'pending'
    },
    { 
      id: 'verification', 
      label: 'Verification', 
      description: 'Bitcoin transaction verification',
      completed: status === 'fulfilled',
      current: false
    },
    { 
      id: 'complete', 
      label: 'Completed', 
      description: 'Funds released successfully',
      completed: status === 'fulfilled'
    }
  ];

  if (status === 'revoked') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Request Revoked</p>
            <p className="text-sm text-red-600">This swap request has been cancelled</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 mb-4">Swap Progress</h4>
        
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : step.current ? (
                  <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${
                    step.completed ? 'text-green-700' : 
                    step.current ? 'text-yellow-700' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  {step.current && (
                    <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                {step.timestamp && (
                  <p className="text-xs text-gray-400 mt-1">{step.timestamp}</p>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className="absolute left-2 mt-8 w-0.5 h-6 bg-gray-200" />
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progress</span>
            <span>{Math.round((steps.filter(s => s.completed).length / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapProgress;
