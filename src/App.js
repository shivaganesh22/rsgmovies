
import './App.css';
import Header from './views/Header';
import { AllRoutes } from './views/Routes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function App() {
  return (
    <div className="App">
      <Header></Header>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"/>
      <ToastContainer />
      <AllRoutes></AllRoutes>
    </div>
  );
}

export default App;
