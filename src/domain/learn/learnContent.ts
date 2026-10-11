import type { LearnRoutePath } from "@/domain/seo/learnRoutePaths";
import { FAQ_CONTENT } from "./faqContent";
import { GUIDE_CONTENT } from "./guideContent";
import type { LearnPageContent } from "./learnContentTypes";
import {
  MATCHING_CONTENT,
  MEASURING_CONTENT,
  PHOTO_CONTENT,
  RADAR_CONTENT,
  TENTACLES_CONTENT,
  THERMOMETER_CONTENT,
  TOOLS_INDEX_CONTENT,
} from "./toolGuideContent";

const LEARN_PAGE_CONTENT: Record<LearnRoutePath, LearnPageContent> = {
  "/guide": GUIDE_CONTENT,
  "/tools": TOOLS_INDEX_CONTENT,
  "/tools/radar": RADAR_CONTENT,
  "/tools/thermometer": THERMOMETER_CONTENT,
  "/tools/matching": MATCHING_CONTENT,
  "/tools/measuring": MEASURING_CONTENT,
  "/tools/tentacles": TENTACLES_CONTENT,
  "/tools/photo": PHOTO_CONTENT,
  "/faq": FAQ_CONTENT,
};

export function learnPageContent(path: LearnRoutePath): LearnPageContent {
  return LEARN_PAGE_CONTENT[path];
}
