import type { Guardia } from "@/shared/types";
import { daysByIndex } from "../types";

export function isOnShift(guardia: Guardia) {
  const now = new Date();
  const today = daysByIndex[now.getDay()];
  const minutes = now.getHours() * 60 + now.getMinutes();
  return guardia.turnos.some((turno) => {
    if (turno.dia !== today) return false;
    const [start, end] = turno.hora.split(" a ").map((part) => {
      const [hour, minute] = part.split(":").map(Number);
      return hour * 60 + minute;
    });
    return (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      minutes >= start &&
      minutes < end
    );
  });
}

export function shiftOfHour(hour: string) {
  if (hour.startsWith("06:00")) return "Mañana";
  if (hour.startsWith("12:00")) return "Tarde";
  return "Noche";
}
