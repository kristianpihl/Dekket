// "Analyse" — placeholder. The AI analysis of the uploaded documents will live here;
// we fill this page in once the analysis exists.
const planned = [
  'Hva hver forsikring dekker, og hva den ikke dekker',
  'Egenandel og viktige unntak, forklart i vanlig språk',
  'Dokumenter som mangler, for eksempel forsikringsbevis eller generelle vilkår',
]

export default function Analysis() {
  return (
    <div className="narrow">
      <div className="page-head">
        <h1>Analyse</h1>
      </div>
      <div className="card-box empty">
        <span className="icon-circle icon-circle--lg">
          <i className="bi bi-stars" aria-hidden="true" />
        </span>
        <h2>Analysen kommer her</h2>
        <p className="text-muted">Dette kommer du til å få se for hver forsikring:</p>
        <ul className="planned-list">
          {planned.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
