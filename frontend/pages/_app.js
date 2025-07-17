import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import '/styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <ToastContainer position="top-center" autoClose={3000} />
    </>
  );
}


