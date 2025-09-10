const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/crosspromo_assets', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const appDynamicDataSchema = new mongoose.Schema({
  Cluster: {
    Platform: String,
    LocalizationCode: String,
    StoreCode: String,
    AppId: String
  },
  AppDynamicData: mongoose.Schema.Types.Mixed
});
const AppDynamicData = mongoose.model('AppDynamicData', appDynamicDataSchema);

function extractCrosspromoFiles(waterfallArray) {
  const files = [];
  
  if (!Array.isArray(waterfallArray)) return files;

  waterfallArray.forEach(item => {
    if (item && item.CrosspromoData && item.CrosspromoData.CrosspromoFiles) {
      const crosspromoFiles = item.CrosspromoData.CrosspromoFiles;
      
      // Находим иконку для этого набора файлов
      const iconFile = crosspromoFiles.find(file => 
        file && file.AdType === 'IconBig'
      );
      
      // Обрабатываем Rewarded видео (добавляем иконку и её размер)
      const rewardedFile = crosspromoFiles.find(file => 
        file && file.AdType === 'Rewarded'
      );
      
      if (rewardedFile) {
        files.push({
          AdType: rewardedFile.AdType,
          AdFormat: rewardedFile.AdFormat || 'Unknown',
          sizeMB: rewardedFile.FileSize ? (rewardedFile.FileSize / (1024 * 1024)).toFixed(2) : '0.00',
          Url: rewardedFile.Url || '',
          iconUrl: iconFile ? iconFile.Url : null,
          iconSizeMB: iconFile && iconFile.FileSize ? (iconFile.FileSize / (1024 * 1024)).toFixed(2) : null
        });
      }
      
      // Обрабатываем другие типы файлов (Banner, Interstitial)
      crosspromoFiles.forEach(file => {
        if (file && file.AdType && ['Banner', 'Interstitial'].includes(file.AdType)) {
          files.push({
            AdType: file.AdType,
            AdFormat: file.AdFormat || 'Unknown',
            sizeMB: file.FileSize ? (file.FileSize / (1024 * 1024)).toFixed(2) : '0.00',
            Url: file.Url || '',
            iconUrl: null,
            iconSizeMB: null
          });
        }
      });
    }
  });

  return files;
}

app.get('/api/assets', async (req, res) => {
  try {
    console.log('=== API /assets called ===');
    console.log('Query params:', req.query);
    
    const filter = {};
    if (req.query.storeCode) {
      filter['Cluster.StoreCode'] = req.query.storeCode;
    }
    if (req.query.appId) {
      filter['Cluster.AppId'] = req.query.appId;
    }
    
    const docs = await AppDynamicData.find(filter);
    console.log(`Found ${docs.length} documents`);

    const result = {};

    docs.forEach((doc, index) => {
      console.log(`\n--- Processing document ${index} ---`);
      const loc = doc.Cluster.LocalizationCode;
      const platform = doc.Cluster.Platform.toLowerCase();

      if (!result[loc]) {
        result[loc] = { ios: [], android: [] };
      }

      if (doc.AppDynamicData && doc.AppDynamicData.AdWaterfall) {
        console.log(`Document ${index}: ${loc}-${platform}, has AdWaterfall`);
        
        const waterfall = doc.AppDynamicData.AdWaterfall;
        
        let allFiles = [];

        ['Rewarded', 'Banner', 'Interstitial'].forEach(adType => {
          if (waterfall[adType] && Array.isArray(waterfall[adType])) {
            console.log(`Processing ${adType}, items: ${waterfall[adType].length}`);
            
            const files = extractCrosspromoFiles(waterfall[adType]);
            console.log(`Found ${files.length} files in ${adType}`);
            
            // Добавляем информацию о платформе и локализации к каждому файлу
            const filesWithMeta = files.map(file => ({
              ...file,
              platform: platform,
              localization: loc
            }));
            
            allFiles = allFiles.concat(filesWithMeta);
          } else {
            console.log(`No ${adType} or not array`);
          }
        });

        console.log(`Total files for ${loc}-${platform}: ${allFiles.length}`);
        
        allFiles.forEach(file => {
          result[loc][platform].push(file);
        });
      } else {
        console.log(`Document ${index}: No AppDynamicData or AdWaterfall`);
      }
    });

    const allLocalizations = ['ru', 'ger', 'eng', 'french'];
    const finalResult = allLocalizations.map(loc => ({
      localization: loc,
      ios: result[loc]?.ios || [],
      android: result[loc]?.android || []
    }));

    console.log('\n=== Final result ===');
    finalResult.forEach(item => {
      console.log(`${item.localization}: iOS(${item.ios.length}), Android(${item.android.length})`);
    });

    res.json(finalResult);

  } catch (err) {
    console.error('Error in /api/assets:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/storeCodes', async (req, res) => {
  try {
    const docs = await AppDynamicData.find().distinct('Cluster.StoreCode');
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appIds', async (req, res) => {
  try {
    const docs = await AppDynamicData.find().distinct('Cluster.AppId');
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(3000, () => console.log('Server running on port 3000 with CORS enabled'));