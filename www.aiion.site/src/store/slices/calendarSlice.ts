import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { Event, Task } from "../../components/types";

/**
 * Calendar (캘린더) 슬라이스
 * 캘린더 관련 상태 관리
 */
export interface CalendarState {
  selectedDate: Date;
  currentMonth: Date;
  events: Event[];
  todayTasks: Task[];
}

export interface CalendarActions {
  setSelectedDate: (date: Date) => void;
  setCurrentMonth: (month: Date) => void;
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (eventId: string, event: Partial<Event>) => void;
  deleteEvent: (eventId: string) => void;
  setTodayTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  resetCalendar: () => void;
}

export interface CalendarSlice extends CalendarState, CalendarActions {}

export const createCalendarSlice: StateCreator<
  AppStore,
  [],
  [],
  CalendarSlice
> = (set) => ({
  // 초기 상태
  selectedDate: new Date(),
  currentMonth: new Date(),
  events: [],
  todayTasks: [],

  // 액션
  setSelectedDate: (date) => set((state) => ({
    calendar: { ...state.calendar, selectedDate: date }
  })),

  setCurrentMonth: (month) => set((state) => ({
    calendar: { ...state.calendar, currentMonth: month }
  })),

  setEvents: (events) => set((state) => ({
    calendar: { ...state.calendar, events }
  })),

  addEvent: (event) => set((state) => ({
    calendar: {
      ...state.calendar,
      events: [...state.calendar.events, event]
    }
  })),

  updateEvent: (eventId, updatedEvent) => set((state) => ({
    calendar: {
      ...state.calendar,
      events: state.calendar.events.map(e =>
        e.id === eventId ? { ...e, ...updatedEvent } : e
      )
    }
  })),

  deleteEvent: (eventId) => set((state) => ({
    calendar: {
      ...state.calendar,
      events: state.calendar.events.filter(e => e.id !== eventId)
    }
  })),

  setTodayTasks: (tasks) => set((state) => ({
    calendar: { ...state.calendar, todayTasks: tasks }
  })),

  addTask: (task) => set((state) => ({
    calendar: {
      ...state.calendar,
      todayTasks: [...state.calendar.todayTasks, task]
    }
  })),

  deleteTask: (taskId) => set((state) => ({
    calendar: {
      ...state.calendar,
      todayTasks: state.calendar.todayTasks.filter(t => t.id !== taskId)
    }
  })),

  resetCalendar: () => set((state) => ({
    calendar: {
      ...state.calendar,
      selectedDate: new Date(),
      currentMonth: new Date(),
      events: [],
      todayTasks: []
    }
  })),
});

