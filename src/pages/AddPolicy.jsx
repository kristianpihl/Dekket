import UploadPolicyForm from '../forms/UploadPolicyForm'

// "Legg til forsikring" — the upload flow lives in forms/UploadPolicyForm.jsx.
export default function AddPolicy() {
  return (
    <div className="narrow">
      <div className="page-head">
        <h1>Legg til forsikring</h1>
      </div>
      <div className="card-box">
        <UploadPolicyForm />
      </div>
    </div>
  )
}
