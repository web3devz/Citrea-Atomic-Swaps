/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from 'react-toastify';
import { ethers } from 'ethers';

export type SwapEventType = 'request_generated' | 'request_fulfilled' | 'funds_released' | 'request_revoked' | 'swap_completed';

export interface SwapEvent {
  type: SwapEventType;
  requestId: number;
  user: string;
  amount: string;
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
}

class NotificationService {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private eventFilters: Map<string, any> = new Map();
  private isListening = false;

  initialize(provider: ethers.JsonRpcProvider, contract: ethers.Contract) {
    this.provider = provider;
    this.contract = contract;
    this.setupEventFilters();
  }

  private setupEventFilters() {
    if (!this.contract) return;

    // Create event filters
    this.eventFilters.set('GenerateRequest', this.contract.filters.GenerateRequest());
    this.eventFilters.set('RequestFulfilled', this.contract.filters.RequestFulfilled());
    this.eventFilters.set('ReleaseFunds', this.contract.filters.ReleaseFunds());
    this.eventFilters.set('RequestRevoked', this.contract.filters.RequestRevoked());
    this.eventFilters.set('SwapCompleted', this.contract.filters.SwapCompleted());
  }

  startListening() {
    if (!this.contract || this.isListening) return;

    this.isListening = true;

    // Listen for new swap requests
    this.contract.on('GenerateRequest', (requestId, requestor, amount, receiver, timestamp, event) => {
      const swapEvent: SwapEvent = {
        type: 'request_generated',
        requestId: Number(requestId),
        user: requestor,
        amount: ethers.formatEther(amount),
        timestamp: Number(timestamp),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };

      this.notifyListeners('request_generated', swapEvent);
      this.showToast('success', `New swap request #${requestId} created for ${parseFloat(ethers.formatEther(amount)).toFixed(4)} cBTC`);
    });

    // Listen for request fulfillments
    this.contract.on('RequestFulfilled', (requestId, fulfiller, isIncluded, timestamp, event) => {
      const swapEvent: SwapEvent = {
        type: 'request_fulfilled',
        requestId: Number(requestId),
        user: fulfiller,
        amount: '0',
        timestamp: Number(timestamp),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };

      this.notifyListeners('request_fulfilled', swapEvent);
      this.showToast('info', `Swap request #${requestId} is being fulfilled`);
    });

    // Listen for fund releases
    this.contract.on('ReleaseFunds', (requestId, user, amount, timestamp, event) => {
      const swapEvent: SwapEvent = {
        type: 'funds_released',
        requestId: Number(requestId),
        user: user,
        amount: ethers.formatEther(amount),
        timestamp: Number(timestamp),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };

      this.notifyListeners('funds_released', swapEvent);
      this.showToast('success', `Funds released for swap #${requestId}: ${parseFloat(ethers.formatEther(amount)).toFixed(4)} cBTC`);
    });

    // Listen for request revocations
    this.contract.on('RequestRevoked', (requestId, requestor, amount, timestamp, event) => {
      const swapEvent: SwapEvent = {
        type: 'request_revoked',
        requestId: Number(requestId),
        user: requestor,
        amount: ethers.formatEther(amount),
        timestamp: Number(timestamp),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };

      this.notifyListeners('request_revoked', swapEvent);
      this.showToast('warning', `Swap request #${requestId} was revoked`);
    });

    // Listen for completed swaps
    this.contract.on('SwapCompleted', (requestId, requestor, fulfiller, amount, timestamp, event) => {
      const swapEvent: SwapEvent = {
        type: 'swap_completed',
        requestId: Number(requestId),
        user: fulfiller,
        amount: ethers.formatEther(amount),
        timestamp: Number(timestamp),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };

      this.notifyListeners('swap_completed', swapEvent);
      this.showToast('success', `🎉 Swap #${requestId} completed! ${parseFloat(ethers.formatEther(amount)).toFixed(4)} cBTC transferred`);
    });

    console.log('🔊 Notification service started listening for events');
  }

  stopListening() {
    if (!this.contract || !this.isListening) return;

    this.contract.removeAllListeners();
    this.isListening = false;
    console.log('🔇 Notification service stopped listening');
  }

  subscribe(eventType: SwapEventType, callback: (event: SwapEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
  }

  unsubscribe(eventType: SwapEventType, callback: (event: SwapEvent) => void) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifyListeners(eventType: SwapEventType, event: SwapEvent) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
  }

  private showToast(type: 'success' | 'error' | 'info' | 'warning', message: string) {
    const toastOptions = {
      position: 'top-right' as const,
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    switch (type) {
      case 'success':
        toast.success(message, toastOptions);
        break;
      case 'error':
        toast.error(message, toastOptions);
        break;
      case 'info':
        toast.info(message, toastOptions);
        break;
      case 'warning':
        toast.warn(message, toastOptions);
        break;
    }
  }

  // Get historical events for initial dashboard load
  async getHistoricalEvents(fromBlock = 0, toBlock = 'latest'): Promise<SwapEvent[]> {
    if (!this.contract) return [];

    try {
      const events: SwapEvent[] = [];

      // Fetch all historical events
      const generateRequestEvents = await this.contract.queryFilter(
        this.contract.filters.GenerateRequest(),
        fromBlock,
        toBlock
      );

      const requestFulfilledEvents = await this.contract.queryFilter(
        this.contract.filters.RequestFulfilled(),
        fromBlock,
        toBlock
      );

      const releaseFundsEvents = await this.contract.queryFilter(
        this.contract.filters.ReleaseFunds(),
        fromBlock,
        toBlock
      );

      const requestRevokedEvents = await this.contract.queryFilter(
        this.contract.filters.RequestRevoked(),
        fromBlock,
        toBlock
      );

      const swapCompletedEvents = await this.contract.queryFilter(
        this.contract.filters.SwapCompleted(),
        fromBlock,
        toBlock
      );

      // Process all events
      [...generateRequestEvents, ...requestFulfilledEvents, ...releaseFundsEvents, 
       ...requestRevokedEvents, ...swapCompletedEvents]
        .sort((a, b) => a.blockNumber - b.blockNumber)
        .forEach(event => {
          const args = event.args;
          if (!args) return;

          let swapEvent: SwapEvent | null = null;

          switch (event.fragment.name) {
            case 'GenerateRequest':
              swapEvent = {
                type: 'request_generated',
                requestId: Number(args[0]),
                user: args[1],
                amount: ethers.formatEther(args[2]),
                timestamp: Number(args[4]),
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
              };
              break;
            case 'RequestFulfilled':
              swapEvent = {
                type: 'request_fulfilled',
                requestId: Number(args[0]),
                user: args[1],
                amount: '0',
                timestamp: Number(args[3]),
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
              };
              break;
            case 'ReleaseFunds':
              swapEvent = {
                type: 'funds_released',
                requestId: Number(args[0]),
                user: args[1],
                amount: ethers.formatEther(args[2]),
                timestamp: Number(args[3]),
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
              };
              break;
            case 'RequestRevoked':
              swapEvent = {
                type: 'request_revoked',
                requestId: Number(args[0]),
                user: args[1],
                amount: ethers.formatEther(args[2]),
                timestamp: Number(args[3]),
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
              };
              break;
            case 'SwapCompleted':
              swapEvent = {
                type: 'swap_completed',
                requestId: Number(args[0]),
                user: args[2], // fulfiller
                amount: ethers.formatEther(args[3]),
                timestamp: Number(args[4]),
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
              };
              break;
          }

          if (swapEvent) {
            events.push(swapEvent);
          }
        });

      return events;
    } catch (error) {
      console.error('Error fetching historical events:', error);
      return [];
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
