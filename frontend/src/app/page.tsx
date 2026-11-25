import Image from "next/image";
import Link from "next/link";
import { routes } from "@/shared/routes";
import { PixelSprite } from "./pixel-sprite";
import styles from "./page.module.css";

const orderSteps = [
  {
    title: "Загрузите файл",
    art: "paper",
    text: "После загрузки CopyHouse покажет, сколько страниц в документе.",
  },
  {
    title: "Сравните точки",
    art: "kiosk",
    text: "Сравните адреса, часы работы и тарифы в своём городе.",
  },
  {
    title: "Проверьте заказ",
    art: "printer",
    text: "Выберите цветность и число копий, затем проверьте итоговую сумму перед оформлением.",
  },
] as const;

export default function Home() {
  return (
    <>
      <main id="main-content" tabIndex={-1}>
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

          <div className={styles.heroContent}>
            <h1 id="hero-title" className={styles.title}>
              <span>Загрузил. Сравнил.</span>
              <span>Напечатал.</span>
            </h1>
            <p className={styles.lead}>
              CopyHouse находит точку печати рядом и показывает цену до оплаты.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} href={routes.upload}>
                Загрузить документ
              </Link>
              <Link className={styles.secondaryAction} href={routes.points}>
                Посмотреть точки
              </Link>
            </div>
          </div>

          <ol className={styles.statuses} aria-label="Этапы заказа">
            <li className={styles.status}>Файл загружен</li>
            <li className={styles.status}>Точка найдена</li>
            <li className={`${styles.status} ${styles.statusReady}`}>
              Заказ готов
            </li>
          </ol>
        </section>

        <section className={styles.flow} id="how-it-works" aria-labelledby="flow-title">
          <div className={styles.flowInner}>
            <h2 id="flow-title" className={styles.flowTitle}>
              Как оформить печать
            </h2>
            <ol className={styles.steps}>
              {orderSteps.map((step, index) => (
                <li className={styles.step} key={step.title}>
                  <div className={styles.stepArt}>
                    <PixelSprite kind={step.art} />
                  </div>
                  <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
                  <div className={styles.stepCopy}>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.preflight} id="pdf-guide" aria-labelledby="guide-title">
          <div className={styles.guideInner}>
            <h2 id="guide-title">Перед тем как печатать</h2>
            <PixelSprite kind="tip" className={styles.guideArt} />
            <div className={styles.guideQuestions}>
              <details>
                <summary>Что можно загрузить?</summary>
                <p>Один PDF до 50 МБ на заказ. Если нужны только отдельные страницы, сохраните их в новый PDF перед загрузкой.</p>
              </details>
              <details>
                <summary>Как избежать ошибок в файле?</summary>
                <p>Откройте готовый PDF и проверьте поля, ориентацию и порядок страниц. Если нужно что-то исправить, замените файл до отправки.</p>
              </details>
              <details>
                <summary>Как работает оплата в этой версии?</summary>
                <p>После оформления нажмите «Оплатить (тест)». Это сменит статус заказа без списания денег.</p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link className={styles.footerBrand} href={routes.home} aria-label="CopyHouse, главная">COPYHOUSE</Link>
          <nav aria-label="Ссылки в подвале">
            <Link href="/#how-it-works">Как работает</Link>
            <Link href="/#pdf-guide">Подготовка PDF</Link>
            <Link href={routes.points}>Точки печати</Link>
            <Link href={routes.login}>Войти</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
