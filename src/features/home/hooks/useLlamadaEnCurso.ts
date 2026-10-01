import { useEffect, useState } from "react";

export function useLlamadaEnCurso() {
  const [segundos, setSegundos] = useState(15);
  const [silenciada, setSilenciada] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSegundos((actual) => actual + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return {
    segundos,
    silenciada,
    alternarSilencio: () => setSilenciada((actual) => !actual),
  };
}

