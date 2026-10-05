import { initials } from '../lib/providerFields'

// A provider's logo, or a round badge with its initials when there is no logo.
export default function ProviderLogo({ name, url, size = 48 }) {
  const style = { width: size, height: size }
  if (url) {
    return <img src={url} alt="" className="provider-logo" style={style} />
  }
  return (
    <span className="provider-logo provider-logo--initials" style={{ ...style, fontSize: size * 0.36 }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
