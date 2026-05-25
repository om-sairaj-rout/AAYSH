import { useSelector } from 'react-redux';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';

function App() {

  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <>
      {isAuthenticated ? <Layout /> : <HomePage />}
    </>
  )
}

export default App
