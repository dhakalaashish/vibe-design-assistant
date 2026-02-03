import { atom } from "jotai";

export type DesignCreationMode =
  | "infer"
  | "build"
  | "processing-infer"
  | "processing-build"
  | null;

export const designCreationModeAtom = atom<DesignCreationMode>(null);
