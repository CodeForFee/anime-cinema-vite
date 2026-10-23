// The animation features framer-motion loads after the first paint (LazyMotion in app/App.tsx): springs, drag,
// layout animations. Kept in their own module so the bundler can split them out of the main chunk.
export { domMax as default } from "framer-motion"
