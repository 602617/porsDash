import BackButton from "./BackButton"
import "../style/PageHeaderProps.css"


type PageHeaderProps = {
  title: string
  subtitle?: string
  showBack?: boolean
  rightSlot?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  showBack = false,
  rightSlot,
}: PageHeaderProps) {
  return (
    <section className="top">
      <div className="header-bar">
        {showBack && (
          <div className="header-left">
            <BackButton />
          </div>
        )}

        <div className="header-center">
          {subtitle && <h3 className="welcome-text">{subtitle}</h3>}
          <h1 className="app-title">{title}</h1>
        </div>

        <div className="header-right">
          {rightSlot}
        </div>
      </div>

      <svg
        className="wave"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,90 C240,50 480,0 720,40 C960,80 1200,120 1440,60 L1440,120 L0,120 Z"
          fill="#ffffff"
        />
      </svg>
    </section>
  )
}


