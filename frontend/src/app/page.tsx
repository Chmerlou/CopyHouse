import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const orderSteps = [
  {
    title: "Загрузите файл",
    text: "PDF или DOCX останется в заказе, пока вы выбираете параметры.",
  },
  {
    title: "Сравните точки",
    text: "Покажем доступные копицентры, цену и ориентировочное время.",
  },
  {
    title: "Заберите печать",
    text: "Выберите удобную точку и приходите, когда заказ будет готов.",
  },
];

export default function Home() {
  return (
    <main>
      <a className={styles.skipLink} href="#main-content">
        Перейти к содержимому
      </a>

      <section className={styles.hero} aria-labelledby="hero-title">
        <Image
          className={`${styles.heroArt} ${styles.desktopArt}`}
          src="/images/copyhouse-hero-desktop.webp"
          alt="Пиксельный университетский кампус и копицентр с открытой комнатой печати"
          fill
          sizes="(max-width: 899px) 0px, 100vw"
          priority
        />
        <Image
          className={`${styles.heroArt} ${styles.mobileArt}`}
          src="/images/copyhouse-hero-mobile.webp"
          alt="Пиксельная комната копицентра с несколькими принтерами, полками и растениями"
          fill
          sizes="(max-width: 899px) 100vw, 0px"
          priority
        />

        <header className={styles.header}>
          <Link className={styles.logo} href="/" aria-label="CopyHouse, главная">
            COPYHOUSE
          </Link>
          <nav className={styles.nav} aria-label="Основная навигация">
            <a className={styles.navLink} href="#how-it-works">
              Как работает
            </a>
            <a className={styles.navLink} href="#how-it-works">
              Точки печати
            </a>
            <a className={styles.loginLink} href="#how-it-works">
              Войти
            </a>
          </nav>
        </header>

        <div className={styles.heroContent} id="main-content">
          <h1 id="hero-title" className={styles.title}>
            <span>Загрузил. Сравнил.</span>
            <span>Напечатал.</span>
          </h1>
          <p className={styles.lead}>
            CopyHouse находит точку печати рядом и показывает цену до оплаты.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="#how-it-works">
              Загрузить документ
            </a>
            <a className={styles.secondaryAction} href="#how-it-works">
              Посмотреть точки
            </a>
          </div>
        </div>

        <ol className={styles.statuses} aria-label="Этапы заказа">
          <li className={styles.status}>Файл загружен</li>
          <li className={styles.status}>Точка найдена</li>
          <li className={`${styles.status} ${styles.statusReady}`}>
            Готово через 15 мин
          </li>
        </ol>
      </section>

      <section className={styles.flow} id="how-it-works" aria-labelledby="flow-title">
        <div className={styles.flowInner}>
          <h2 id="flow-title" className={styles.flowTitle}>
            Весь заказ на одном экране
          </h2>
          <ol className={styles.steps}>
            {orderSteps.map((step, index) => (
              <li className={styles.step} key={step.title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
