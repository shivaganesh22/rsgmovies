
import './App.css';
import Header from './views/Header';
import { AllRoutes } from './views/Routes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function App() {
  return (
    <div className="App">
      <Header></Header>
      <ToastContainer />
      <AllRoutes></AllRoutes>
    </div>
  );
}

export default App;
