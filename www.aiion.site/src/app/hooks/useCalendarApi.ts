/**
 * 캘린더 API 함수
 * 백엔드 calendar-service와 통신
 */

import { fetchJSONFromGateway } from '../../lib/api/client';
import { SERVICE_ENDPOINTS } from '../../lib/constants/endpoints';
import { Event, Task } from '../../components/types';

// 백엔드 응답 형식 (code는 소문자로 고정)
interface Messenger {
  code: number; // @JsonProperty("code")로 소문자 고정
  message: string;
  data: any;
}

// 백엔드 EventModel 형식
interface EventModel {
  id?: number;
  userId?: number;
  text?: string;
  date?: string; // "YYYY-MM-DD"
  time?: string; // "HH:mm:ss" or "HH:mm"
  description?: string;
  isAllDay?: boolean;
  alarmOn?: boolean;
  notification?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 백엔드 TaskModel 형식
interface TaskModel {
  id?: number;
  userId?: number;
  text?: string;
  date?: string; // "YYYY-MM-DD"
  completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 백엔드 EventModel을 프론트엔드 Event로 변환
 */
function eventModelToEvent(model: EventModel): Event {
  console.log('[eventModelToEvent] 변환 시작:', model);
  
  const event: Event = {
    id: model.id?.toString() || Date.now().toString(),
    date: model.date || new Date().toISOString().split('T')[0],
    text: model.text || '',
    time: model.time ? (model.time.includes(':') ? model.time.substring(0, 5) : model.time) : undefined,
    description: model.description,
    isAllDay: model.isAllDay ?? false,
    alarmOn: model.alarmOn ?? false,
    notification: model.notification ?? false,
  };
  
  console.log('[eventModelToEvent] 변환 완료:', event);
  return event;
}

/**
 * 프론트엔드 Event를 백엔드 EventModel로 변환
 */
function eventToModel(event: Event, userId: number): EventModel {
  if (!userId) {
    throw new Error('사용자 ID가 필요합니다. 로그인 상태를 확인해주세요.');
  }
  
  // 날짜 형식 확인 (YYYY-MM-DD)
  let formattedDate = event.date;
  if (formattedDate) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(formattedDate)) {
      try {
        const date = new Date(formattedDate);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        }
      } catch (e) {
        throw new Error(`날짜 변환 실패: ${formattedDate}`);
      }
    }
  }
  
  // 시간 형식 변환 (HH:mm -> HH:mm:00)
  let formattedTime: string | undefined = undefined;
  if (event.time && !event.isAllDay) {
    if (event.time === '하루종일') {
      formattedTime = undefined;
    } else if (event.time.includes(':')) {
      const parts = event.time.split(':');
      if (parts.length === 2) {
        formattedTime = `${parts[0]}:${parts[1]}:00`;
      } else {
        formattedTime = event.time;
      }
    } else {
      formattedTime = event.time;
    }
  }
  
  const eventModel: EventModel = {
    // 새로 생성하는 경우 id를 전송하지 않음 (백엔드에서 자동 생성)
    // id는 업데이트 시에만 전송
    id: undefined,
    userId: userId,
    text: event.text,
    date: formattedDate,
    time: formattedTime,
    description: event.description,
    isAllDay: event.isAllDay ?? false,
    alarmOn: event.alarmOn ?? false,
    notification: event.notification ?? false,
  };
  
  return eventModel;
}

/**
 * 백엔드 TaskModel을 프론트엔드 Task로 변환
 */
function taskModelToTask(model: TaskModel): Task {
  console.log('[taskModelToTask] 변환 시작:', model);
  
  const task: Task = {
    id: model.id?.toString() || Date.now().toString(),
    date: model.date || new Date().toISOString().split('T')[0],
    text: model.text || '',
    completed: model.completed ?? false,
  };
  
  console.log('[taskModelToTask] 변환 완료:', task);
  return task;
}

/**
 * 프론트엔드 Task를 백엔드 TaskModel로 변환
 */
function taskToModel(task: Task, userId: number): TaskModel {
  if (!userId) {
    throw new Error('사용자 ID가 필요합니다. 로그인 상태를 확인해주세요.');
  }
  
  // 날짜 형식 확인 (YYYY-MM-DD)
  let formattedDate = task.date;
  if (formattedDate) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(formattedDate)) {
      try {
        const date = new Date(formattedDate);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        }
      } catch (e) {
        throw new Error(`날짜 변환 실패: ${formattedDate}`);
      }
    }
  }
  
  const taskModel: TaskModel = {
    // 새로 생성하는 경우 id를 전송하지 않음 (백엔드에서 자동 생성)
    // id는 업데이트 시에만 전송
    id: undefined,
    userId: userId,
    text: task.text,
    date: formattedDate,
    completed: task.completed ?? false,
  };
  
  return taskModel;
}

/**
 * 사용자별 일정 목록 조회
 */
export async function fetchEventsByUserId(userId?: number): Promise<Event[]> {
  // Gateway 라우팅: /calendar/** → calendar-service
  // 백엔드 컨트롤러: @RequestMapping("/events")
  // JWT 토큰 기반 조회: /calendar/events/user (토큰에서 userId 자동 추출)
  // 또는 기존 방식: /calendar/events/user/{userId} (하위 호환성)
  const endpoint = userId ? `/calendar/events/user/${userId}` : `/calendar/events/user`;
  console.log('[fetchEventsByUserId] API 호출 시작:', endpoint, userId ? `(userId: ${userId})` : '(JWT 토큰 기반)');
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    console.log('[fetchEventsByUserId] 응답 상태:', response.status);
    console.log('[fetchEventsByUserId] 응답 데이터:', response.data);

    if (response.error) {
      console.error('[fetchEventsByUserId] 응답 에러:', response.error);
      return [];
    }

    if (!response.data) {
      console.warn('[fetchEventsByUserId] 응답 데이터가 없음');
      return [];
    }

    const messenger = response.data as Messenger;
    // code는 소문자로 고정
    const responseCode = messenger?.code;
    
    if (responseCode !== 200) {
      console.warn('[fetchEventsByUserId] 응답 코드가 200이 아님:', responseCode);
      return [];
    }

    if (Array.isArray(messenger.data)) {
      if (messenger.data.length === 0) {
        return [];
      }
      const events = messenger.data.map((item: EventModel) => eventModelToEvent(item));
      console.log('[fetchEventsByUserId] 변환된 일정:', events.length, '개');
      return events;
    }

    if (messenger.data && typeof messenger.data === 'object' && !Array.isArray(messenger.data)) {
      return [eventModelToEvent(messenger.data as EventModel)];
    }

    return [];
  } catch (error) {
    console.error('[fetchEventsByUserId] 예외 발생:', error);
    return [];
  }
}

/**
 * 날짜별 일정 조회
 */
export async function fetchEventsByDate(userId: number, date: string): Promise<Event[]> {
  const endpoint = `/calendar/events/user/${userId}/date/${date}`;
  console.log('[fetchEventsByDate] API 호출 시작:', endpoint);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    if (response.error || !response.data) {
      return [];
    }

    const messenger = response.data as Messenger;
    // code는 소문자로 고정
    const responseCode = messenger?.code;
    
    if (responseCode !== 200) {
      return [];
    }

    if (Array.isArray(messenger.data)) {
      return messenger.data.map((item: EventModel) => eventModelToEvent(item));
    }

    if (messenger.data && typeof messenger.data === 'object' && !Array.isArray(messenger.data)) {
      return [eventModelToEvent(messenger.data as EventModel)];
    }

    return [];
  } catch (error) {
    console.error('[fetchEventsByDate] 예외 발생:', error);
    return [];
  }
}

/**
 * 일정 저장
 */
export async function createEvent(event: Event, userId: number): Promise<Event> {
  console.log('[createEvent] 일정 저장 시작:', { event, userId });
  const eventModel = eventToModel(event, userId);
  console.log('[createEvent] 전송할 EventModel:', JSON.stringify(eventModel, null, 2));
  
  try {
    const endpoint = `/calendar/events`;
    
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'POST',
        body: JSON.stringify(eventModel),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[createEvent] 응답 상태:', response.status);
    console.log('[createEvent] 응답 데이터 (원본):', response.data);
    console.log('[createEvent] 응답 데이터 (JSON):', JSON.stringify(response.data, null, 2));
    console.log('[createEvent] 응답 에러:', response.error);

    // HTTP 상태 코드가 404이면 엔드포인트를 찾을 수 없음
    if (response.status === 404) {
      const errorData = response.data as any;
      console.error('[createEvent] 404 Not Found:', errorData);
      throw new Error(`일정 저장 엔드포인트를 찾을 수 없습니다. (${errorData?.path || endpoint})`);
    }

    // HTTP 상태 코드가 400 이상이면 에러
    if (response.status >= 400) {
      const errorData = response.data as any;
      console.error('[createEvent] HTTP 에러:', response.status, errorData);
      throw new Error(errorData?.message || errorData?.error || `서버 오류가 발생했습니다. (${response.status})`);
    }

    if (response.error || !response.data) {
      console.error('[createEvent] 응답 에러 또는 데이터 없음:', { error: response.error, data: response.data });
      throw new Error(response.error || '일정을 저장하는데 실패했습니다.');
    }

    const messenger = response.data as Messenger;
    // code는 소문자로 고정
    const responseCode = messenger?.code;
    
    console.log('[createEvent] Messenger 객체:', messenger);
    console.log('[createEvent] Messenger.code:', messenger?.code);
    console.log('[createEvent] 최종 응답 코드:', responseCode);
    console.log('[createEvent] Messenger 메시지:', messenger?.message);
    console.log('[createEvent] Messenger 데이터:', messenger?.data);
    
    // 응답 코드가 없거나 200이 아니면 에러
    if (responseCode === undefined || responseCode === null) {
      console.error('[createEvent] 응답 코드가 없음. 전체 응답:', messenger);
      throw new Error('서버 응답 형식이 올바르지 않습니다.');
    }
    
    if (responseCode !== 200) {
      console.error('[createEvent] 백엔드 응답 코드가 200이 아님:', responseCode, messenger?.message);
      throw new Error(messenger?.message || '일정을 저장하는데 실패했습니다.');
    }

    if (!messenger.data) {
      console.error('[createEvent] 저장된 일정 데이터가 없음');
      throw new Error('저장된 일정 데이터가 없습니다.');
    }

    const convertedEvent = eventModelToEvent(messenger.data as EventModel);
    console.log('[createEvent] 변환된 Event:', convertedEvent);
    return convertedEvent;
  } catch (error) {
    console.error('[createEvent] 예외 발생:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('일정을 저장하는데 실패했습니다.');
  }
}

/**
 * 일정 수정
 */
export async function updateEvent(event: Event, userId: number): Promise<Event> {
  if (!event.id) {
    throw new Error('ID가 필요합니다.');
  }
  
  // 업데이트는 ID가 필수이므로 ID를 포함한 EventModel 생성
  const eventModel = eventToModel(event, userId);
  // ID를 명시적으로 설정 (업데이트 시 필수)
  const eventId = parseInt(event.id);
  if (isNaN(eventId)) {
    throw new Error(`유효하지 않은 ID입니다: ${event.id}`);
  }
  eventModel.id = eventId;
  
  console.log('[updateEvent] 업데이트할 EventModel:', JSON.stringify(eventModel, null, 2));
  
  const response = await fetchJSONFromGateway<Messenger>(
    `/calendar/events`,
    {},
    {
      method: 'PUT',
      body: JSON.stringify(eventModel),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.error || !response.data) {
    throw new Error(response.error || '일정을 수정하는데 실패했습니다.');
  }

  const messenger = response.data as Messenger;
  // code는 소문자로 고정
  const responseCode = messenger?.code;
  
  if (responseCode !== 200) {
    throw new Error(messenger.message || '일정을 수정하는데 실패했습니다.');
  }

  return eventModelToEvent(messenger.data as EventModel);
}

/**
 * 일정 삭제
 */
export async function deleteEvent(event: Event, userId: number): Promise<void> {
  // 삭제는 ID가 필수이므로 ID를 포함한 EventModel 생성
  const eventModel: EventModel = {
    id: event.id ? parseInt(event.id) : undefined,
    userId: userId,
    text: event.text,
    date: event.date,
    time: event.time,
    description: event.description,
    isAllDay: event.isAllDay ?? false,
    alarmOn: event.alarmOn ?? false,
    notification: event.notification ?? false,
  };
  
  const response = await fetchJSONFromGateway<Messenger>(
    `/calendar/events`,
    {},
    {
      method: 'DELETE',
      body: JSON.stringify(eventModel),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.error || !response.data) {
    throw new Error(response.error || '일정을 삭제하는데 실패했습니다.');
  }

  const messenger = response.data as Messenger;
  const responseCode = messenger?.code; // code는 소문자로 고정
  
  if (responseCode !== 200) {
    throw new Error(messenger.message || '일정을 삭제하는데 실패했습니다.');
  }
}

/**
 * 사용자별 할 일 목록 조회
 */
export async function fetchTasksByUserId(userId?: number): Promise<Task[]> {
  // JWT 토큰 기반 조회: userId가 없으면 토큰에서 자동 추출
  const endpoint = userId ? `/calendar/tasks/user/${userId}` : `/calendar/tasks/user`;
  console.log('[fetchTasksByUserId] API 호출 시작:', endpoint, userId ? `(userId: ${userId})` : '(JWT 토큰 기반)');
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    if (response.error || !response.data) {
      return [];
    }

    const messenger = response.data as Messenger;
    // code는 소문자로 고정
    const responseCode = messenger?.code;
    
    if (responseCode !== 200) {
      return [];
    }

    if (Array.isArray(messenger.data)) {
      return messenger.data.map((item: TaskModel) => taskModelToTask(item));
    }

    if (messenger.data && typeof messenger.data === 'object' && !Array.isArray(messenger.data)) {
      return [taskModelToTask(messenger.data as TaskModel)];
    }

    return [];
  } catch (error) {
    console.error('[fetchTasksByUserId] 예외 발생:', error);
    return [];
  }
}

/**
 * 날짜별 할 일 조회
 */
export async function fetchTasksByDate(userId: number, date: string): Promise<Task[]> {
  const endpoint = `/calendar/tasks/user/${userId}/date/${date}`;
  console.log('[fetchTasksByDate] API 호출 시작:', endpoint);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    if (response.error || !response.data) {
      return [];
    }

    const messenger = response.data as Messenger;
    // code는 소문자로 고정
    const responseCode = messenger?.code;
    
    if (responseCode !== 200) {
      return [];
    }

    if (Array.isArray(messenger.data)) {
      return messenger.data.map((item: TaskModel) => taskModelToTask(item));
    }

    if (messenger.data && typeof messenger.data === 'object' && !Array.isArray(messenger.data)) {
      return [taskModelToTask(messenger.data as TaskModel)];
    }

    return [];
  } catch (error) {
    console.error('[fetchTasksByDate] 예외 발생:', error);
    return [];
  }
}

/**
 * 할 일 저장
 */
export async function createTask(task: Task, userId: number): Promise<Task> {
  console.log('[createTask] 할 일 저장 시작:', { task, userId });
  const taskModel = taskToModel(task, userId);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      `/calendar/tasks`,
      {},
      {
        method: 'POST',
        body: JSON.stringify(taskModel),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.error || !response.data) {
      throw new Error(response.error || '할 일을 저장하는데 실패했습니다.');
    }

    const messenger = response.data as Messenger;
    const responseCode = messenger?.code; // code는 소문자로 고정
    
    if (responseCode !== 200) {
      throw new Error(messenger.message || '할 일을 저장하는데 실패했습니다.');
    }

    if (!messenger.data) {
      throw new Error('저장된 할 일 데이터가 없습니다.');
    }

    return taskModelToTask(messenger.data as TaskModel);
  } catch (error) {
    console.error('[createTask] 예외 발생:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('할 일을 저장하는데 실패했습니다.');
  }
}

/**
 * 할 일 수정
 */
export async function updateTask(task: Task, userId: number): Promise<Task> {
  if (!task.id) {
    throw new Error('ID가 필요합니다.');
  }
  
  // 업데이트는 ID가 필수이므로 ID를 포함한 TaskModel 생성
  const taskModel = taskToModel(task, userId);
  // ID를 명시적으로 설정 (업데이트 시 필수)
  const taskId = parseInt(task.id);
  if (isNaN(taskId)) {
    throw new Error(`유효하지 않은 ID입니다: ${task.id}`);
  }
  taskModel.id = taskId;
  
  const response = await fetchJSONFromGateway<Messenger>(
    `/calendar/tasks`,
    {},
    {
      method: 'PUT',
      body: JSON.stringify(taskModel),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.error || !response.data) {
    throw new Error(response.error || '할 일을 수정하는데 실패했습니다.');
  }

  const messenger = response.data as Messenger;
  const responseCode = messenger?.code; // code는 소문자로 고정
  
  if (responseCode !== 200) {
    throw new Error(messenger.message || '할 일을 수정하는데 실패했습니다.');
  }

  return taskModelToTask(messenger.data as TaskModel);
}

/**
 * 할 일 완료 상태 토글
 */
export async function toggleTaskCompleted(taskId: number): Promise<Task> {
  const response = await fetchJSONFromGateway<Messenger>(
    `/calendar/tasks/toggle/${taskId}`,
    {},
    {
      method: 'PUT',
    }
  );

  if (response.error || !response.data) {
    throw new Error(response.error || '할 일 완료 상태를 변경하는데 실패했습니다.');
  }

  const messenger = response.data as Messenger;
  const responseCode = messenger?.code; // code는 소문자로 고정
  
  if (responseCode !== 200) {
    throw new Error(messenger.message || '할 일 완료 상태를 변경하는데 실패했습니다.');
  }

  return taskModelToTask(messenger.data as TaskModel);
}

/**
 * 할 일 삭제
 */
export async function deleteTask(task: Task, userId: number): Promise<void> {
  // 삭제는 ID가 필수이므로 ID를 포함한 TaskModel 생성
  const taskModel: TaskModel = {
    id: task.id ? parseInt(task.id) : undefined,
    userId: userId,
    text: task.text,
    date: task.date,
    completed: task.completed ?? false,
  };
  
  const response = await fetchJSONFromGateway<Messenger>(
    `/calendar/tasks`,
    {},
    {
      method: 'DELETE',
      body: JSON.stringify(taskModel),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.error || !response.data) {
    throw new Error(response.error || '할 일을 삭제하는데 실패했습니다.');
  }

  const messenger = response.data as Messenger;
  const responseCode = messenger?.code; // code는 소문자로 고정
  
  if (responseCode !== 200) {
    throw new Error(messenger.message || '할 일을 삭제하는데 실패했습니다.');
  }
}

