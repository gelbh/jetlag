import { expose } from "comlink";
import {
  runEndGameMaskFromDisks,
  runMaskFromUnionInput,
} from "./kernel/maskKernelRunner";

expose({
  buildMaskFromUnionInput: runMaskFromUnionInput,
  buildEndGameMaskFromDisks: runEndGameMaskFromDisks,
});
