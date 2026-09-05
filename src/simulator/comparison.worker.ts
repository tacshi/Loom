/// <reference lib="webworker" />
import { compareReplacement } from "../model/replacement";
onmessage = ({ data }) => {
  try {
    postMessage(
      compareReplacement(data.project, data.old, data.next, data.mapping),
    );
  } catch {
    postMessage({ passed: false, cases: 0, reason: "replacementInvalid" });
  }
};
