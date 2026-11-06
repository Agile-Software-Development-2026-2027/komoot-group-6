import { CommentIcon } from './icons.jsx';
import styles from './TrailPage.module.css';

// PLACEHOLDER of the comments section (SCRUM-16 "Add comments on a hike").
// For the colleague who develops it: this component receives the id of the trail,
// so it can load and add the comments of this trail. Everything inside the
// <section> can be replaced; keep id="comments" (it allows links to #comments).
export default function TrailComments({ trailId }) {
  return (
    <section
      id="comments"
      className={`${styles.section} ${styles.comments}`}
      aria-labelledby="trail-comments"
      data-trail-id={trailId}
    >
      <h2 id="trail-comments">Comments</h2>

      <div className={styles.emptyComments}>
        <CommentIcon />
        <p>
          <strong>No comments yet</strong>
          Soon you will be able to share tips and impressions about this trail.
        </p>
      </div>
    </section>
  );
}