import { toast } from 'react-toastify';

const showToast = (message) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: JSON.parse(localStorage.getItem("darkMode")) || false ? "dark" : "light",

  });
};
const showError = (message) => {
  toast.error(message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: JSON.parse(localStorage.getItem("darkMode")) || false ? "dark" : "light",

  });
};

export const toastSuccess = (message) => {
  showToast(message);
};

export const toastWarning = (message) => {
  showError(message);
};