import { HabitsView } from '../models/habits.model';

export const HABITS_FALLBACK: HabitsView = {
  progress: 50, completed: 5, total: 10, streak: 14,
  sections: [
    { title: 'Mañana', time: '6am - 12pm', icon: 'Sol', habits: [
      { name: 'Desayunar', done: true, streak: 14 }, { name: 'Ir a la escuela', done: true, streak: 8 }, { name: 'Registrar transporte', done: false, streak: 3 },
    ] },
    { title: 'Tarde', time: '12pm - 6pm', icon: 'Día', habits: [
      { name: 'Comer dentro del plan', done: false, streak: 5 }, { name: 'Trabajar', done: true, streak: 12 }, { name: 'Registrar comida', done: false, streak: 22 },
    ] },
    { title: 'Noche', time: '6pm - 11pm', icon: 'Luna', habits: [
      { name: 'Gym', done: false, streak: 4 }, { name: 'Cenar', done: false, streak: 7 }, { name: 'Revisar presupuesto', done: false, streak: 2 }, { name: 'Dormir', done: false, streak: 0 },
    ] },
  ],
};
