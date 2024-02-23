import logo from './logo.svg';
import './App.css';
import Header from './views/Header';
import { AllRoutes } from './views/Routes';

function App() {
  return (
    <div className="App">
      <Header></Header>
      <AllRoutes></AllRoutes>
    </div>
  );
}

export default App;
