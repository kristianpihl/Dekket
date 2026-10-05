import { Col, Form, InputGroup, Row } from 'react-bootstrap'
import { docKinds, holders, insuranceTypes } from '../content/insuranceTypes'

// The form fields that describe a policy. Used in the "add" flow and the "edit" dialog.
// `values` is the form state (see lib/policyFields.js); `onChange(patch)` merges changes into it.
// `idPrefix` keeps the field ids unique when two forms exist on the same page.
export default function PolicyFields({ values, onChange, idPrefix = 'pf', titlePlaceholder, kindRequired = false }) {
  const id = (name) => `${idPrefix}-${name}`

  return (
    <>
      <Form.Group className="mb-3" controlId={id('title')}>
        <Form.Label>Navn</Form.Label>
        <Form.Control
          type="text"
          placeholder={titlePlaceholder ?? 'F.eks. Innboforsikring 2026'}
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId={id('kind')}>
        <Form.Label>Hva slags dokument er dette?</Form.Label>
        <Form.Select
          value={values.docKind}
          required={kindRequired}
          onChange={(e) => onChange({ docKind: e.target.value })}
        >
          {kindRequired ? (
            <option value="">Velg …</option>
          ) : (
            <option value="unknown">Ikke oppgitt</option>
          )}
          {docKinds.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Form.Select>
        <Form.Text muted>Hjelper Dekket å se om det mangler noe, for eksempel forsikringsbeviset.</Form.Text>
      </Form.Group>

      <Row>
        <Col sm={6}>
          <Form.Group className="mb-3" controlId={id('type')}>
            <Form.Label>Type forsikring</Form.Label>
            <Form.Select value={values.type} onChange={(e) => onChange({ type: e.target.value })}>
              {insuranceTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col sm={6}>
          <Form.Group className="mb-3" controlId={id('holder')}>
            <Form.Label>Hvem har tegnet den?</Form.Label>
            <Form.Select value={values.holder} onChange={(e) => onChange({ holder: e.target.value })}>
              {holders.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3" controlId={id('insurer')}>
        <Form.Label>Forsikringsselskap (valgfritt)</Form.Label>
        <Form.Control
          type="text"
          placeholder="F.eks. If, Gjensidige, Tryg"
          value={values.insurer}
          onChange={(e) => onChange({ insurer: e.target.value })}
        />
      </Form.Group>

      <Row>
        <Col sm={6}>
          <Form.Group className="mb-3" controlId={id('from')}>
            <Form.Label>Gyldig fra (valgfritt)</Form.Label>
            <Form.Control
              type="date"
              value={values.validFrom}
              onChange={(e) => onChange({ validFrom: e.target.value })}
            />
          </Form.Group>
        </Col>
        <Col sm={6}>
          <Form.Group className="mb-3" controlId={id('to')}>
            <Form.Label>Gyldig til / fornyes (valgfritt)</Form.Label>
            <Form.Control
              type="date"
              value={values.validTo}
              onChange={(e) => onChange({ validTo: e.target.value })}
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3" controlId={id('premium')}>
        <Form.Label>Pris (valgfritt)</Form.Label>
        <InputGroup>
          <Form.Control
            type="text"
            inputMode="decimal"
            placeholder="F.eks. 1 185"
            value={values.premium}
            onChange={(e) => onChange({ premium: e.target.value })}
          />
          <InputGroup.Text>kr</InputGroup.Text>
          <Form.Select
            aria-label="Prisen gjelder per"
            value={values.premiumPeriod}
            onChange={(e) => onChange({ premiumPeriod: e.target.value })}
            className="premium-period"
          >
            <option value="year">per år</option>
            <option value="month">per måned</option>
          </Form.Select>
        </InputGroup>
      </Form.Group>
    </>
  )
}
