export interface NavItem {
  id: string
  label: string
}

interface NavBarProps {
  items: NavItem[]
  current: string
  onNavigate: (id: string) => void
}

function NavBar({ items, current, onNavigate }: NavBarProps) {
  return (
    <nav style={styles.nav}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          style={{
            ...styles.link,
            ...(item.id === current ? styles.linkActive : {}),
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    padding: '10px 16px',
    background: '#f0f0f0',
    borderBottom: '1px solid #ddd',
  },
  link: {
    padding: '8px 16px',
    fontSize: 15,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#333',
    cursor: 'pointer',
  },
  linkActive: {
    background: '#007bff',
    color: '#fff',
  },
}

export default NavBar