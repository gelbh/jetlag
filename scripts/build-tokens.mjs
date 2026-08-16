#!/usr/bin/env node
/**
 * Build Tailwind v4 @theme CSS from DTCG tokens via Style Dictionary.
 * Usage: npm run tokens:build
 */
import StyleDictionary from "style-dictionary";
import config from "../style-dictionary.config.mjs";

const sd = new StyleDictionary(config);
await sd.cleanAllPlatforms();
await sd.buildAllPlatforms();
