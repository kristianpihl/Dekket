import { Link } from 'react-router-dom'

// "Dette bør du gjøre" — short list of suggested next steps.
// Each todo may have an `action` { label, to } that links to a page in the app.
export default function TodoList({ todos }) {
  return (
    <div className="todos">
      {todos.map((todo) => (
        <div key={todo.id} className="todo">
          <span className="icon-circle">
            <i className={`bi bi-${todo.icon}`} aria-hidden="true" />
          </span>
          <div className="todo-text">
            <div className="todo-title">{todo.title}</div>
            <div className="todo-note">{todo.note}</div>
          </div>
          {todo.action && (
            <Link to={todo.action.to} className="btn btn-outline-primary btn-sm">
              {todo.action.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
