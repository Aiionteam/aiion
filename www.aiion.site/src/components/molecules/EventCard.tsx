import React from 'react';
import { Icon } from '../atoms';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
  onToggleNotification: (id: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onToggleNotification,
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-[#f5f1e8] rounded-lg">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{event.text}</div>
        <div className="text-sm text-gray-500">
          {event.isAllDay ? '하루종일' : event.time}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleNotification(event.id)}
          className={`p-2 rounded-lg ${
            event.notification
              ? 'bg-[#d4cdc0] text-[#8B7355]'
              : 'bg-[#e8e2d5] text-gray-600'
          }`}
        >
          <Icon name="bell" size="sm" />
        </button>
      </div>
    </div>
  );
};

