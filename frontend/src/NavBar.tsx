import styles from './NavBar.module.css'

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
    <nav className={styles.nav}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onNavigate(item.id)}
          className={
            item.id === current
              ? `${styles.link} ${styles.linkActive}`
              : styles.link
          }
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default NavBar