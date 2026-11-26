import Image from "next/image";
import Link from "next/link";
import { routes } from "@/shared/routes";
import { PixelSprite } from "./pixel-sprite";
import styles from "./page.module.css";

const orderSteps = [
  {
    title: "Загрузите файл",
    art: "paper",
    text: "Загрузите один PDF до 50 МБ. Количество страниц определится автоматически.",
  },
  {
    title: "Настройте печать",
    art: "printer",
    text: "Выберите чёрно-белую или цветную печать и укажите число копий.",
  },
  {
    title: "Сравните точки",
    art: "kiosk",
    text: "Сравните полную стоимость, адреса и часы работы копицентров.",
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
            alt=""
            fill
            sizes="(max-width: 899px) 0px, 100vw"
            priority
          />
          <Image
            className={`${styles.heroArt} ${styles.mobileArt}`}
            src="/images/copyhouse-hero-mobile.webp"
            alt=""
            fill
            sizes="(max-width: 899px) 100vw, 0px"
            priority
          />

          <div className={styles.heroContent}>
            <h1 id="hero-title" className={styles.title}>
              <span>Загрузите PDF.</span>{" "}
              <span>Выберите копицентр.</span>
            </h1>
            <p className={styles.lead}>
              Сравните стоимость печати до оплаты и заберите распечатки по коду.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} href={routes.upload}>
                Начать заказ
              </Link>
              <Link className={styles.secondaryAction} href={routes.points}>
                Посмотреть точки
              </Link>
            </div>
          </div>

          <ol className={styles.statuses} aria-label="Этапы заказа">
            <li className={styles.status}>Загрузить PDF</li>
            <li className={styles.status}>Настроить печать</li>
            <li className={`${styles.status} ${styles.statusReady}`}>
              Сравнить цены
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
                <summary>Что проверить перед загрузкой?</summary>
                <p>Откройте PDF и проверьте поля, ориентацию и порядок страниц. Убедитесь, что в файле только те страницы, которые нужно напечатать.</p>
              </details>
              <details>
                <summary>Будут ли списаны деньги?</summary>
                <p>Нет. Сейчас оплата работает в тестовом режиме. Заказ получит статус «Оплачен», а деньги не спишутся.</p>
              </details>
              <details>
                <summary>Как забрать заказ?</summary>
                <p>Откройте заказ в разделе «Мои заказы». Когда распечатки будут готовы, появится код выдачи. Покажите его сотруднику копицентра.</p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link className={styles.footerBrand} href={routes.home} aria-label="CopyHouse, главная">COPYHOUSE</Link>
          <nav aria-label="Нижняя навигация">
            <Link href="/#how-it-works">Как работает</Link>
            <Link href="/#pdf-guide">Подготовка PDF</Link>
            <Link href={routes.points}>Точки печати</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
