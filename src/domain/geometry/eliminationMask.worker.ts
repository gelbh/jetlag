import { expose } from "comlink";
import {
  buildEndGameMaskFromDisks,
  buildMaskFromUnionInput,
} from "./kernel/buildMask";

expose({ buildMaskFromUnionInput, buildEndGameMaskFromDisks });
