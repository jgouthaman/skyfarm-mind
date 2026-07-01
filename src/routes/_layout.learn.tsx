import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/learn')({
  component: LearnLayout,
})

function LearnLayout() {
  return <Outlet />
}
