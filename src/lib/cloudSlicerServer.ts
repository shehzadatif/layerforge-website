import type { CloudSlicerEnvironment } from "./cloudSlicer";

function processEnvironmentValue(name: string): string | undefined {
  const runtimeProcess = (
    globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  return runtimeProcess?.env?.[name];
}

export function getCloudSlicerServerEnvironment(): CloudSlicerEnvironment {
  return {
    CLOUD_SLICER_API_TOKEN:
      import.meta.env.CLOUD_SLICER_API_TOKEN ??
      processEnvironmentValue("CLOUD_SLICER_API_TOKEN"),
    CLOUD_SLICER_JOB_SIGNING_SECRET:
      import.meta.env.CLOUD_SLICER_JOB_SIGNING_SECRET ??
      processEnvironmentValue("CLOUD_SLICER_JOB_SIGNING_SECRET"),
    CLOUD_SLICER_PRINTER_ID:
      import.meta.env.CLOUD_SLICER_PRINTER_ID ??
      processEnvironmentValue("CLOUD_SLICER_PRINTER_ID"),
    CLOUD_SLICER_FILAMENT_ID_PLA:
      import.meta.env.CLOUD_SLICER_FILAMENT_ID_PLA ??
      processEnvironmentValue("CLOUD_SLICER_FILAMENT_ID_PLA"),
    CLOUD_SLICER_FILAMENT_ID_PETG:
      import.meta.env.CLOUD_SLICER_FILAMENT_ID_PETG ??
      processEnvironmentValue("CLOUD_SLICER_FILAMENT_ID_PETG"),
    CLOUD_SLICER_FILAMENT_ID_ABS:
      import.meta.env.CLOUD_SLICER_FILAMENT_ID_ABS ??
      processEnvironmentValue("CLOUD_SLICER_FILAMENT_ID_ABS"),
    CLOUD_SLICER_FILAMENT_ID_TPU:
      import.meta.env.CLOUD_SLICER_FILAMENT_ID_TPU ??
      processEnvironmentValue("CLOUD_SLICER_FILAMENT_ID_TPU"),
  };
}
