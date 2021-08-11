import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
// import React from 'react';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { readTime } from '../../utils/radingTime';

interface Post {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const readingTime = readTime(post.data.content);
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }
  return (
    <>
      <Head>
        <title>{`${post.data.title} | spacetraveling`}</title>
      </Head>
      <Header />
      <main className={commonStyles.body}>
        <div>
          <img
            className={styles.banner}
            src={post.data.banner.url}
            alt="banner"
          />
        </div>

        <article className={`${commonStyles.containerPage} ${styles.post}`}>
          <h1>{post.data.title}</h1>
          <div className={styles.postDetails}>
            <p>
              <FiCalendar />
              <span>
                {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </span>
            </p>
            <p>
              <FiClock />
              <span>{readingTime}</span>
            </p>
            <p>
              <FiUser />
              <span>{post.data.author}</span>
            </p>
          </div>
          <section className={styles.content}>
            {post.data.content.map(({ heading, body }, index) => (
              <div key={String(index)}>
                <h2>{heading}</h2>
                <div
                  className={styles.boxContent}
                  dangerouslySetInnerHTML={{ __html: RichText.asHtml(body) }}
                />
              </div>
            ))}
          </section>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);
  const paths = posts.results.map(post => ({ params: { slug: post.uid } }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const { title, author, banner, content, subtitle } = response.data;

  const Title = Array.isArray(title) ? RichText.asText(title) : title;

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: Title,
      banner: { url: banner.url },
      author,
      content: content.map(({ heading, body }) => {
        return {
          heading,
          body,
        };
      }),
      subtitle,
    },
  };

  return {
    props: { post, preview },
    revalidate: 60 * 60, // 1 hora
  };
};
