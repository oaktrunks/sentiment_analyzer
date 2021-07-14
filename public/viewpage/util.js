import * as Element from "./element.js";
import * as Constant from "../model/constant.js";

export function popupInfo(title, body, modal) {
  if (modal) {
    $("#" + modal).modal("hide");
  }
  Element.popupInfoTitle.innerHTML = title;
  Element.popupInfoBody.innerHTML = body;
  $("#" + Constant.iDmodalPopupInfo).modal("show");
}

export function disableButton(button) {
  button.disabled = true;
  const originalLabel = button.innerHTML;
  button.innerHTML = "Wait...";
  return originalLabel;
}

export function enableButton(button, originalLabel) {
  if (originalLabel) button.innerHTML = originalLabel;
  button.disabled = false;
}

export function disabledButtonSetLabel(button, originalLabel) {
  if (originalLabel) button.innerHTML = originalLabel;
  button.disabled = true;
}

export function getDisabled(button) {
  return button.disabled;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
