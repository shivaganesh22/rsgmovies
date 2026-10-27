import { toast } from 'react-toastify';

export const toastSuccess = (message) => {
  toast.success(message, {
    position: 'bottom-right',
    autoClose: 3500,
    theme: 'dark',
  });
};

export const toastWarning = (message) => {
  toast.warning(message, {
    position: 'bottom-right',
    autoClose: 4000,
    theme: 'dark',
  });
};

export const toastError = (message) => {
  toast.error(message, {
    position: 'bottom-right',
    autoClose: 5000,
    theme: 'dark',
  });
};

export const toastInfo = (message) => {
  toast.info(message, {
    position: 'bottom-right',
    autoClose: 3500,
    theme: 'dark',
  });
};

export default {
  toastSuccess,
  toastWarning,
  toastError,
  toastInfo,
};
