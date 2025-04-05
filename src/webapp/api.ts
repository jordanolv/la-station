import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Request, Response } from 'express';
//import { client } from '../bot/app';
import multer, { DiskStorageOptions } from 'multer';
import { BotClient } from '../bot/BotClient';
import { GameService } from '../database/services/GameService';
import mongo, { get } from 'mongoose';

export function createAPI(client: BotClient) {
  const app = express();

  app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.set('view engine', 'ejs');
  app.set('views', 'src/webapp/views');
  app.use('/uploads', express.static('uploads'));
  app.use(express.urlencoded({ extended: false }));

  passport.use(new LocalStrategy(
    function (username: string, password: string, done: (error: any, user?: any) => void) {
      if (username === "user" && password === "password") {
        return done(null, { id: 1, name: "User" });
      }
      return done(null, false);
    }
  ));

  passport.serializeUser(function (user: any, done: (error: any, id?: any) => void) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id: any, done: (error: any, user?: any) => void) {
    done(null, { id: 1, name: "User" });
  });

  // Définir le dossier de destination des fichiers téléchargés
  const storage: multer.StorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const extension = file.originalname.split('.').pop();
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.' + extension);
    }
  });

  const upload = multer({ storage });

  app.get('/', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.render('index', { user: req.user });
    } else {
      res.redirect('/login');
    }
  });

  app.get('/login', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.redirect('/');
    }
    res.render('login');
  });

  app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
  }));

  app.get('/test', async (req: Request, res: Response) => {
    const guild = await getGuild('1148634282093445150');
    
    res.send(guild?.name);
  });

  app.post('/game/create', upload.single('gameimage'), async (req: Request, res: Response) => {
    const guild = await getGuild('1148634282093445150');

    const gameName = req.body.gamename;
    const gameDescription = req.body.gamedescription;
    const gameImage = req.file ? req.file.filename : '';
    const gameColor = req.body.gamecolor || '#55CCFC';

    const game = {
      name: gameName,
      description: gameDescription,
      image: gameImage,
      color: gameColor
    };
    
    client.emit('gameCreate', game, guild, client);

    res.send('ok');
  });

  const getGuild = async(id:string) => {
    const guild = client.guilds.cache.get(id);
    return guild;
  }

  return app;
}