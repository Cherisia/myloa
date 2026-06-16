import ToolsNav from './ToolsNav'

export default function ToolsLayout({ children }) {
  return (
    <>
      <ToolsNav />
      {children}
    </>
  )
}
