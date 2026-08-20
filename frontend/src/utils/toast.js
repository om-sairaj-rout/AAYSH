import originalToast from "react-hot-toast";
import { notify } from "./notify";

/**
 * App-wide toast API — same surface as react-hot-toast, styled via notify.
 * Import from here instead of "react-hot-toast" so notifications stay consistent.
 */
export const toast = Object.assign(
  (message, options) => notify.info(message, options),
  {
    success: (message, options) => notify.success(message, options),
    error: (message, options) => notify.error(message, options),
    loading: (message) => notify.loading(message),
    info: (message, options) => notify.info(message, options),
    warning: (message, options) => notify.warning(message, options),
    validation: (message, options) => notify.validation(message, options),
    dismiss: (id) => originalToast.dismiss(id),
    custom: originalToast.custom,
    promise: originalToast.promise,
  }
);

export default toast;
