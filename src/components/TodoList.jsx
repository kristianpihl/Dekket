// "Dette bør du gjøre" — short list of suggested next steps.
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
            <a href={todo.action.href} className="btn btn-outline-primary btn-sm">
              {todo.action.label}
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
