package com.rsg.movies.ui.person

import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.rsg.movies.R
import com.rsg.movies.data.model.MediaItem
import com.rsg.movies.providers.ContentProviderFactory
import com.rsg.movies.ui.adapters.GridSpacingItemDecoration
import com.rsg.movies.ui.adapters.ModernMediaCardAdapter
import kotlinx.coroutines.launch

class PersonActivity : FragmentActivity() {

    private var personId: String = ""
    private var personName: String = ""
    private var personCharacter: String = ""
    private var personProfile: String = ""

    private lateinit var ivAvatar: ImageView
    private lateinit var tvName: TextView
    private lateinit var tvRole: TextView
    private lateinit var tvAppearances: TextView
    private lateinit var rvFilmography: RecyclerView
    private lateinit var pbLoading: ProgressBar

    private val mediaItems = mutableListOf<MediaItem>()
    private lateinit var mediaAdapter: ModernMediaCardAdapter
    private var currentPage = 1
    private var isLoading = false
    private var hasMorePages = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_person_modern)

        personId = intent.getStringExtra("PERSON_ID") ?: ""
        personName = intent.getStringExtra("PERSON_NAME") ?: "Cast Member"
        personCharacter = intent.getStringExtra("PERSON_CHARACTER") ?: intent.getStringExtra("PERSON_ROLE") ?: ""
        personProfile = intent.getStringExtra("PERSON_PROFILE") ?: intent.getStringExtra("PROFILE_PATH") ?: ""

        ivAvatar = findViewById(R.id.iv_person_avatar)
        tvName = findViewById(R.id.tv_person_name)
        tvRole = findViewById(R.id.tv_person_role)
        tvAppearances = findViewById(R.id.tv_person_appearances)
        rvFilmography = findViewById(R.id.rv_person_grid)
        pbLoading = findViewById(R.id.pb_person_loading)

        tvName.text = personName
        tvRole.text = if (personCharacter.isNotBlank()) "as $personCharacter" else "Actor / Cast"
        tvAppearances.text = "Loading appearances..."

        Glide.with(this)
            .load(personProfile)
            .placeholder(R.drawable.ic_placeholder)
            .error(R.drawable.ic_placeholder)
            .into(ivAvatar)

        val spacingPx = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, 10f, resources.displayMetrics
        ).toInt()
        rvFilmography.addItemDecoration(GridSpacingItemDecoration(6, spacingPx, true))

        com.rsg.movies.ui.TvFocusHelper.attachGridFocus(rvFilmography, 6)

        mediaAdapter = ModernMediaCardAdapter(mediaItems, showTypeBadge = false)
        rvFilmography.adapter = mediaAdapter

        rvFilmography.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                val lm = recyclerView.layoutManager as? androidx.recyclerview.widget.LinearLayoutManager ?: return
                val total = lm.itemCount
                val last = lm.findLastVisibleItemPosition()
                if (!isLoading && hasMorePages && total <= (last + 6)) {
                    loadFilmography()
                }
            }
        })

        loadFilmography()
    }

    private fun loadFilmography() {
        if (isLoading || !hasMorePages) return
        isLoading = true

        if (currentPage == 1) {
            pbLoading.visibility = View.VISIBLE
        }

        lifecycleScope.launch {
            try {
                val provider = ContentProviderFactory.create()
                val resp = provider.getCastFilmography(personId, currentPage)

                pbLoading.visibility = View.GONE
                val items = resp?.data
                if (!items.isNullOrEmpty()) {
                    val startPos = mediaItems.size
                    mediaItems.addAll(items)
                    mediaAdapter.notifyItemRangeInserted(startPos, items.size)
                    currentPage++
                    hasMorePages = resp.hasMorePages()
                    tvAppearances.text = "${mediaItems.size} Known Works / Appearances"
                } else {
                    hasMorePages = false
                    if (mediaItems.isNotEmpty()) {
                        tvAppearances.text = "${mediaItems.size} Known Works / Appearances"
                    } else {
                        tvAppearances.text = "0 Known Works / Appearances"
                    }
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                Toast.makeText(this@PersonActivity, "Failed to load filmography: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }
}
