import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './routes/Landing'

// Code-split the heavy routes: the editor pulls in the preview/comment engine,
// and the public viewer pulls in supabase-js. Keeping them out of the initial
// chunk leaves the Landing page tiny.
const Editor = lazy(() => import('./routes/Editor'))
const Review = lazy(() => import('./routes/Review'))

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-dotgrid">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/r/:shareId" element={<Review />} />
      </Routes>
    </Suspense>
  )
}
