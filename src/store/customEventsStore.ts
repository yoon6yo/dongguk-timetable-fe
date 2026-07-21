import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomEvent {
  /** Negative, unique per event -- kept out of the positive range real DB
   * course ids use, so a synthesized CourseRow (see lib/customEvents.ts)
   * never collides with a real course when both flow through the same
   * courseById map / courseBackgroundColor(id) hash. */
  id: number;
  name: string;
  dayOfWeek: number;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
}

interface CustomEventsState {
  events: CustomEvent[];
  addEvent: (event: Omit<CustomEvent, "id">) => void;
  removeEvent: (id: number) => void;
}

export const useCustomEventsStore = create<CustomEventsState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) =>
        set((state) => {
          // Derived from current state (not a module-level counter) so a
          // fresh id never collides with one restored from localStorage.
          const nextId = Math.min(0, ...state.events.map((e) => e.id)) - 1;
          return { events: [...state.events, { id: nextId, ...event }] };
        }),
      removeEvent: (id) => set((state) => ({ events: state.events.filter((e) => e.id !== id) })),
    }),
    { name: "timetable-custom-events" }
  )
);
