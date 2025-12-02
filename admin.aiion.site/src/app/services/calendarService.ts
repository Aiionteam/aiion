/**
 * 캘린더 서비스 레이어
 * CalendarView 컴포넌트의 비즈니스 로직을 서비스로 분리
 * 백엔드 API와 통신하여 DB에 저장/삭제
 */

import { Event, Task } from '../../components/types';
import { getLocalDateStr } from '../../lib';
import {
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  toggleTaskCompleted,
} from '../hooks/useCalendarApi';
import { useStore } from '../../store';

export interface AddEventParams {
  text: string;
  time: string;
  isAllDay: boolean;
  selectedDate: Date;
  existingEvents: Event[];
}

export interface AddEventResult {
  success: boolean;
  errorMessage?: string;
  event?: Event;
}

export interface AddTaskParams {
  text: string;
  selectedDate: Date;
  existingTasks: Task[];
}

export interface AddTaskResult {
  success: boolean;
  errorMessage?: string;
  task?: Task;
}

export interface ToggleAlarmParams {
  eventId: string;
  events: Event[];
}

export interface DeleteItemParams {
  type: 'event' | 'task';
  id: string;
  events: Event[];
  tasks: Task[];
}

/**
 * 일정 추가 유효성 검사
 */
export function validateAddEvent(params: AddEventParams): {
  isValid: boolean;
  errorMessage: string;
} {
  const { text, time, isAllDay } = params;

  if (!text.trim()) {
    return {
      isValid: false,
      errorMessage: '텍스트를 작성해주세요',
    };
  }

  if (!isAllDay && !time) {
    return {
      isValid: false,
      errorMessage: '시간설정과 텍스트를 작성해주세요',
    };
  }

  if (params.existingEvents.length >= 100) {
    return {
      isValid: false,
      errorMessage: '일정은 최대 100개까지 저장할 수 있습니다.',
    };
  }

  return {
    isValid: true,
    errorMessage: '',
  };
}

/**
 * 할 일 추가 유효성 검사
 */
export function validateAddTask(params: AddTaskParams): {
  isValid: boolean;
  errorMessage: string;
} {
  const { text, selectedDate, existingTasks } = params;

  if (!text.trim()) {
    return {
      isValid: false,
      errorMessage: '텍스트를 작성해주세요',
    };
  }

  if (text.length > 20) {
    return {
      isValid: false,
      errorMessage: '할 일은 최대 20자까지 입력 가능합니다.',
    };
  }

  const selectedDateStr = getLocalDateStr(selectedDate);
  const dateTasks = existingTasks.filter(t => t.date === selectedDateStr);

  if (dateTasks.length >= 100) {
    return {
      isValid: false,
      errorMessage: '할 일은 최대 100개까지 저장할 수 있습니다.',
    };
  }

  return {
    isValid: true,
    errorMessage: '',
  };
}

/**
 * 일정 추가 서비스 (백엔드 DB에 저장)
 */
export async function addEventService(params: AddEventParams): Promise<AddEventResult> {
  const validation = validateAddEvent(params);

  if (!validation.isValid) {
    return {
      success: false,
      errorMessage: validation.errorMessage,
    };
  }

  try {
    // 사용자 ID 가져오기
    const userId = useStore.getState().user?.user?.id;
    if (!userId) {
      return {
        success: false,
        errorMessage: '로그인이 필요합니다.',
      };
    }

    const newEvent: Event = {
      id: Date.now().toString(), // 임시 ID, 백엔드에서 실제 ID 반환됨
      date: getLocalDateStr(params.selectedDate),
      text: params.text,
      time: params.isAllDay ? '하루종일' : params.time,
      isAllDay: params.isAllDay,
      alarmOn: true,
    };

    // 백엔드 API 호출하여 DB에 저장
    const savedEvent = await apiCreateEvent(newEvent, userId);
    
    return {
      success: true,
      event: savedEvent,
    };
  } catch (error) {
    console.error('[addEventService] 일정 저장 실패:', error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : '일정 저장에 실패했습니다.',
    };
  }
}

/**
 * 할 일 추가 서비스 (백엔드 DB에 저장)
 */
export async function addTaskService(params: AddTaskParams): Promise<AddTaskResult> {
  const validation = validateAddTask(params);

  if (!validation.isValid) {
    return {
      success: false,
      errorMessage: validation.errorMessage,
    };
  }

  try {
    // 사용자 ID 가져오기
    const userId = useStore.getState().user?.user?.id;
    if (!userId) {
      return {
        success: false,
        errorMessage: '로그인이 필요합니다.',
      };
    }

    const selectedDateStr = getLocalDateStr(params.selectedDate);
    const newTask: Task = {
      id: Date.now().toString(), // 임시 ID, 백엔드에서 실제 ID 반환됨
      date: selectedDateStr,
      text: params.text,
      completed: false,
    };

    // 백엔드 API 호출하여 DB에 저장
    const savedTask = await apiCreateTask(newTask, userId);
    
    return {
      success: true,
      task: savedTask,
    };
  } catch (error) {
    console.error('[addTaskService] 할 일 저장 실패:', error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : '할 일 저장에 실패했습니다.',
    };
  }
}

/**
 * 알람 토글 서비스 (백엔드 DB 업데이트)
 */
export async function toggleAlarmService(params: ToggleAlarmParams): Promise<Event[]> {
  try {
    const userId = useStore.getState().user?.user?.id;
    if (!userId) {
      return params.events;
    }

    const event = params.events.find(e => e.id === params.eventId);
    if (!event) {
      return params.events;
    }

    const updatedEvent: Event = {
      ...event,
      alarmOn: !event.alarmOn,
    };

    // 백엔드 API 호출하여 DB 업데이트
    const savedEvent = await apiUpdateEvent(updatedEvent, userId);
    
    // 로컬 상태도 업데이트
    return params.events.map(e =>
      e.id === params.eventId ? savedEvent : e
    );
  } catch (error) {
    console.error('[toggleAlarmService] 알람 토글 실패:', error);
    // 에러 발생 시 로컬 상태만 변경
    return params.events.map(e =>
      e.id === params.eventId ? { ...e, alarmOn: !e.alarmOn } : e
    );
  }
}

/**
 * 할 일 삭제 서비스
 */
export function deleteTaskService(taskId: string, tasks: Task[]): Task[] {
  return tasks.filter(t => t.id !== taskId);
}

/**
 * 일정 삭제 서비스
 */
export function deleteEventService(eventId: string, events: Event[]): Event[] {
  return events.filter(e => e.id !== eventId);
}

/**
 * 항목 삭제 서비스 (일정 또는 할 일, 백엔드 DB에서 삭제)
 */
export async function deleteItemService(params: DeleteItemParams): Promise<{
  events: Event[];
  tasks: Task[];
}> {
  try {
    const userId = useStore.getState().user?.user?.id;
    if (!userId) {
      // 로그인 안 된 경우 로컬만 삭제
      if (params.type === 'event') {
        return {
          events: params.events.filter(e => e.id !== params.id),
          tasks: params.tasks,
        };
      } else {
        return {
          events: params.events,
          tasks: params.tasks.filter(t => t.id !== params.id),
        };
      }
    }

    if (params.type === 'event') {
      const event = params.events.find(e => e.id === params.id);
      if (event) {
        // 백엔드 DB에서 삭제
        await apiDeleteEvent(event, userId);
      }
      return {
        events: params.events.filter(e => e.id !== params.id),
        tasks: params.tasks,
      };
    } else {
      const task = params.tasks.find(t => t.id === params.id);
      if (task) {
        // 백엔드 DB에서 삭제
        await apiDeleteTask(task, userId);
      }
      return {
        events: params.events,
        tasks: params.tasks.filter(t => t.id !== params.id),
      };
    }
  } catch (error) {
    console.error('[deleteItemService] 삭제 실패:', error);
    // 에러 발생 시 로컬만 삭제
    if (params.type === 'event') {
      return {
        events: params.events.filter(e => e.id !== params.id),
        tasks: params.tasks,
      };
    } else {
      return {
        events: params.events,
        tasks: params.tasks.filter(t => t.id !== params.id),
      };
    }
  }
}

