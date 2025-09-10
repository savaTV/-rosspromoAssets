<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="6">
        <v-select
          v-model="selectedStoreCode"
          :items="storeCodes"
          label="Выберите StoreCode"
          outlined
          clearable
          @update:modelValue="fetchAssets"
        ></v-select>
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="selectedAppId"
          :items="appIds"
          label="Выберите AppId"
          outlined
          clearable
          @update:modelValue="fetchAssets"
        ></v-select>
      </v-col>
    </v-row>

    <v-card>
      <v-card-title>Crosspromo Assets</v-card-title>
      <v-card-text>
        <div v-if="loading" class="text-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div>Загрузка данных...</div>
        </div>
        
        <v-table v-else>
          <thead>
            <tr>
              <th>Локализация</th>
              <th>iOS</th>
              <th>Android</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in assets" :key="item.localization">
              <td>{{ locNames[item.localization] || item.localization }}</td>
              <td>
                <div v-if="item.ios.length === 0" class="no-data">Нет данных</div>
                <div v-else>
                    <v-btn
                    v-for="file in item.ios"
                    :key="file.Url"
                    @click="openModal(file)"
                    variant="outlined"
                    color="primary"
                    size="small"
                    class="ma-1"
                  >
                    {{ file.AdType }} ({{ file.sizeMB }}мб)
                  </v-btn>
                </div>
              </td>
              <td>
                <div v-if="item.android.length === 0" class="no-data">Нет данных</div>
                <div v-else>
                  <v-btn
                    v-for="file in item.android"
                    :key="file.Url"
                    @click="openModal(file)"
                    variant="outlined"
                    color="primary"
                    size="small"
                    class="ma-1"
                  >
                    {{ file.AdType }} ({{ file.sizeMB }}мб)
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

  <v-dialog v-model="dialog" max-width="800px">
    <v-card v-if="selectedFile">
      <v-card-title>
        {{ locNames[selectedFile.localization] || selectedFile.localization }} – 
        {{ selectedFile.platform }} – {{ selectedFile.AdType }}
      </v-card-title>
      <v-card-text>
        <!-- Контейнер для видео и иконки -->
        <div v-if="selectedFile.AdFormat === 'Video'" class="video-container">
          <!-- YouTube видео -->
          <div v-if="isYouTubeUrl(selectedFile.Url)" class="youtube-container">
            <iframe 
              :src="getYouTubeEmbedUrl(selectedFile.Url)" 
              frameborder="0" 
              allowfullscreen
            ></iframe>
          </div>
          
          <!-- Обычное видео -->
          <video 
            v-else
            :src="selectedFile.Url" 
            controls 
            style="max-width: 100%; height: auto; border-radius: 8px;"
          ></video>
          
          <!-- Размер видео -->
          <div class="file-size-info mt-2">
            <v-chip size="small" color="primary">
              Видео: {{ selectedFile.sizeMB }} МБ
            </v-chip>
          </div>
          
          <!-- Иконка под видео -->
          <div v-if="selectedFile.iconUrl" class="icon-container mt-4">
            <h4>Иконка:</h4>
            <img 
              :src="selectedFile.iconUrl" 
              style="max-width: 100px; height: auto; border-radius: 8px;"
              @error="handleIconError"
            />
            <!-- Размер иконки -->
            <div class="file-size-info mt-2">
              <v-chip size="small" color="secondary" v-if="selectedFile.iconSizeMB">
                Иконка: {{ selectedFile.iconSizeMB }} МБ
              </v-chip>
            </div>
          </div>
        </div>
        
        <!-- Изображение (для других форматов) -->
        <div v-else-if="selectedFile.AdFormat === 'Image'" class="text-center">
          <img 
            :src="selectedFile.Url" 
            style="max-width: 100%; height: auto; border-radius: 8px;" 
            @error="handleImageError"
          />
          <!-- Размер изображения -->
          <div class="file-size-info mt-2">
            <v-chip size="small" color="primary">
              Изображение: {{ selectedFile.sizeMB }} МБ
            </v-chip>
          </div>
        </div>
        
        <v-alert v-else type="info" class="mt-3">
          Формат: {{ selectedFile.AdFormat }}
        </v-alert>
        
        <v-list class="mt-3">
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialog = false">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const storeCodes = ref([]);
const appIds = ref([]);
const selectedStoreCode = ref(null);
const selectedAppId = ref(null);
const assets = ref([]);
const loading = ref(false);
const dialog = ref(false);
const selectedFile = ref(null);

const locNames = {
  ru: 'rus',
  ger: 'ger',
  eng: 'eng',
  french: 'fr'
};

const isYouTubeUrl = (url) => {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
};

const getYouTubeEmbedUrl = (url) => {
  if (!url) return '';
  
  if (url.includes('youtube.com/watch')) {
    const videoId = url.split('v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if (ampersandPosition !== -1) {
      return `https://www.youtube.com/embed/${videoId.substring(0, ampersandPosition)}`;
    }
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  return url;
};

const handleImageError = (event) => {
  console.error('Ошибка загрузки изображения:', event.target.src);
  event.target.style.display = 'none';
};

const handleIconError = (event) => {
  console.error('Ошибка загрузки иконки:', event.target.src);
  event.target.style.display = 'none';
};

const fetchUniqueValues = async () => {
  try {
    const [storeRes, appRes] = await Promise.all([
      axios.get('http://localhost:3000/api/storeCodes'),
      axios.get('http://localhost:3000/api/appIds')
    ]);
    storeCodes.value = storeRes.data;
    appIds.value = appRes.data;
  } catch (error) {
    console.error('Ошибка при загрузке уникальных значений:', error);
  }
};

const fetchAssets = async () => {
  loading.value = true;
  try {
    const params = {};
    if (selectedStoreCode.value) params.storeCode = selectedStoreCode.value;
    if (selectedAppId.value) params.appId = selectedAppId.value;
    
    const res = await axios.get('http://localhost:3000/api/assets', { params });
    assets.value = res.data;
  } catch (error) {
    console.error('Ошибка при загрузке активов:', error);
    assets.value = [];
  } finally {
    loading.value = false;
  }
};

const openModal = (file) => {
  console.log('Opening modal with file:', file);
  selectedFile.value = file;
  dialog.value = true;
};

onMounted(() => {
  fetchUniqueValues();
  fetchAssets();
});
</script>

<style scoped>
/* Добавьте эти стили */
.video-container {
  position: relative;
  width: 100%;
}

.youtube-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 соотношение */
  overflow: hidden;
  border-radius: 8px;
}

.youtube-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

</style>