import { Component } from 'react'
import { useLocation, Link } from 'react-router-dom'

class Boundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <section role="alert" className="m-6 rounded-xl border border-red-200 bg-white p-6">
      <h2 className="font-semibold text-gray-900">Esta área não conseguiu abrir</h2>
      <p className="mt-2 text-sm text-gray-600">Tente abrir novamente. O app não apagou os dados salvos; alterações ainda não salvas nesta tela podem ter sido perdidas.</p>
      <div className="mt-4 flex gap-4 text-sm"><button onClick={() => this.setState({ failed: false })} className="underline text-orange-700">Tentar novamente</button><Link to="/" className="underline">Voltar ao início</Link></div>
    </section>
  }
}
export default function PageErrorBoundary({ children }) {
  const location = useLocation()
  return <Boundary key={location.pathname}>{children}</Boundary>
}
