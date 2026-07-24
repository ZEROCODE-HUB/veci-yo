import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '32px', textAlign: 'center', color: '#991B1B', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Error al renderizar</h2>
          <p style={{ fontSize: '14px', color: '#6B7280', wordBreak: 'break-word' }}>
            {this.state.error.message}
          </p>
          <pre style={{ fontSize: '11px', color: '#374151', marginTop: '16px', textAlign: 'left', maxHeight: '300px', overflow: 'auto', background: '#F3F4F6', padding: '12px', borderRadius: '8px' }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
