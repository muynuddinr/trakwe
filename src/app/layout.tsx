import type {Metadata} from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata:Metadata={title:'Trackwe | Fleet Operations',description:'Trackwe fleet management — frontend demonstration'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
